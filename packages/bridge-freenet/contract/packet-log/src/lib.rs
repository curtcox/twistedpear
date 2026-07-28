use freenet_stdlib::prelude::*;
use std::collections::BTreeMap;

const STATE_MAGIC: &[u8] = b"TPLG\x01";
const HEADER_LENGTH: usize = 9;
const ENTRY_HEADER_LENGTH: usize = 11;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LogEntry {
    pub direction: u8,
    pub index: u64,
    pub payload: Vec<u8>,
}

fn valid_parameters(parameters: &[u8]) -> bool {
    parameters.len() == 2 || parameters.len() == 34
}

fn capacity(parameters: &[u8]) -> Option<usize> {
    if !valid_parameters(parameters) {
        return None;
    }
    let value = u16::from_be_bytes([parameters[0], parameters[1]]) as usize;
    (value > 0).then_some(value)
}

pub fn encode_entries(entries: &[LogEntry]) -> Result<Vec<u8>, &'static str> {
    let count = u32::try_from(entries.len()).map_err(|_| "too many entries")?;
    let mut out = Vec::with_capacity(
        HEADER_LENGTH
            + entries
                .iter()
                .map(|entry| ENTRY_HEADER_LENGTH + entry.payload.len())
                .sum::<usize>(),
    );
    out.extend_from_slice(STATE_MAGIC);
    out.extend_from_slice(&count.to_be_bytes());
    let mut previous = None;
    for entry in entries {
        if entry.direction > 1 {
            return Err("invalid direction");
        }
        if entry.payload.len() > u16::MAX as usize {
            return Err("payload too large");
        }
        let key = (entry.direction, entry.index);
        if previous.is_some_and(|value| value >= key) {
            return Err("entries not canonical");
        }
        previous = Some(key);
        out.push(entry.direction);
        out.extend_from_slice(&entry.index.to_be_bytes());
        out.extend_from_slice(&(entry.payload.len() as u16).to_be_bytes());
        out.extend_from_slice(&entry.payload);
    }
    Ok(out)
}

pub fn decode_entries(
    bytes: &[u8],
    retention: usize,
) -> Result<Vec<LogEntry>, &'static str> {
    if retention == 0 || bytes.len() < HEADER_LENGTH || !bytes.starts_with(STATE_MAGIC) {
        return Err("invalid state header");
    }
    let count = u32::from_be_bytes([bytes[5], bytes[6], bytes[7], bytes[8]]) as usize;
    let mut cursor = HEADER_LENGTH;
    let mut entries = Vec::with_capacity(count);
    let mut previous = None;
    let mut direction_counts = [0usize; 2];
    for _ in 0..count {
        let header_end = cursor
            .checked_add(ENTRY_HEADER_LENGTH)
            .ok_or("entry length overflow")?;
        if header_end > bytes.len() {
            return Err("truncated entry header");
        }
        let direction = bytes[cursor];
        if direction > 1 {
            return Err("invalid direction");
        }
        let index = u64::from_be_bytes(
            bytes[cursor + 1..cursor + 9]
                .try_into()
                .map_err(|_| "invalid index")?,
        );
        let payload_length =
            u16::from_be_bytes([bytes[cursor + 9], bytes[cursor + 10]]) as usize;
        let payload_end = header_end
            .checked_add(payload_length)
            .ok_or("payload length overflow")?;
        if payload_end > bytes.len() {
            return Err("truncated payload");
        }
        let key = (direction, index);
        if previous.is_some_and(|value| value >= key) {
            return Err("entries not canonical");
        }
        previous = Some(key);
        direction_counts[direction as usize] += 1;
        if direction_counts[direction as usize] > retention {
            return Err("retention exceeded");
        }
        entries.push(LogEntry {
            direction,
            index,
            payload: bytes[header_end..payload_end].to_vec(),
        });
        cursor = payload_end;
    }
    if cursor != bytes.len() {
        return Err("trailing state bytes");
    }
    Ok(entries)
}

pub fn merge_encoded(
    retention: usize,
    left: &[u8],
    right: &[u8],
) -> Result<Vec<u8>, &'static str> {
    let mut merged = BTreeMap::<(u8, u64), Vec<u8>>::new();
    for entry in decode_entries(left, retention)?
        .into_iter()
        .chain(decode_entries(right, retention)?)
    {
        merged
            .entry((entry.direction, entry.index))
            .and_modify(|payload| {
                if entry.payload < *payload {
                    *payload = entry.payload.clone();
                }
            })
            .or_insert(entry.payload);
    }

    let mut entries = Vec::new();
    for direction in 0..=1 {
        let mut selected = merged
            .iter()
            .filter(|((candidate, _), _)| *candidate == direction)
            .map(|((_, index), payload)| LogEntry {
                direction,
                index: *index,
                payload: payload.clone(),
            })
            .collect::<Vec<_>>();
        if selected.len() > retention {
            selected.drain(0..selected.len() - retention);
        }
        entries.extend(selected);
    }
    encode_entries(&entries)
}

fn merge_candidate(
    parameters: &Parameters<'_>,
    current: &mut Vec<u8>,
    candidate: &[u8],
) -> Result<(), ContractError> {
    let retention = capacity(parameters.as_ref()).ok_or(ContractError::InvalidUpdate)?;
    *current =
        merge_encoded(retention, current, candidate).map_err(|_| ContractError::InvalidUpdate)?;
    Ok(())
}

pub struct PacketLogContract;

#[contract]
impl ContractInterface for PacketLogContract {
    fn validate_state(
        parameters: Parameters<'static>,
        state: State<'static>,
        _related: RelatedContracts<'static>,
    ) -> Result<ValidateResult, ContractError> {
        let valid = capacity(parameters.as_ref())
            .and_then(|retention| decode_entries(state.as_ref(), retention).ok())
            .is_some();
        Ok(if valid {
            ValidateResult::Valid
        } else {
            ValidateResult::Invalid
        })
    }

    fn update_state(
        parameters: Parameters<'static>,
        state: State<'static>,
        data: Vec<UpdateData<'static>>,
    ) -> Result<UpdateModification<'static>, ContractError> {
        let retention = capacity(parameters.as_ref()).ok_or(ContractError::InvalidUpdate)?;
        decode_entries(state.as_ref(), retention).map_err(|_| ContractError::InvalidUpdate)?;
        let mut merged = state.as_ref().to_vec();
        for update in data {
            match update {
                UpdateData::State(candidate) => {
                    merge_candidate(&parameters, &mut merged, candidate.as_ref())?
                }
                UpdateData::Delta(candidate) => {
                    merge_candidate(&parameters, &mut merged, candidate.as_ref())?
                }
                UpdateData::StateAndDelta { state, delta } => {
                    merge_candidate(&parameters, &mut merged, state.as_ref())?;
                    merge_candidate(&parameters, &mut merged, delta.as_ref())?;
                }
                _ => return Err(ContractError::InvalidUpdate),
            }
        }
        Ok(UpdateModification::valid(State::from(merged)))
    }

    fn summarize_state(
        _parameters: Parameters<'static>,
        state: State<'static>,
    ) -> Result<StateSummary<'static>, ContractError> {
        Ok(StateSummary::from(state.as_ref().to_vec()))
    }

    fn get_state_delta(
        _parameters: Parameters<'static>,
        state: State<'static>,
        summary: StateSummary<'static>,
    ) -> Result<StateDelta<'static>, ContractError> {
        if state.as_ref() == summary.as_ref() {
            Ok(StateDelta::from(Vec::new()))
        } else {
            Ok(StateDelta::from(state.as_ref().to_vec()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn encoded(entries: &[(u8, u64, &[u8])]) -> Vec<u8> {
        encode_entries(
            &entries
                .iter()
                .map(|(direction, index, payload)| LogEntry {
                    direction: *direction,
                    index: *index,
                    payload: payload.to_vec(),
                })
                .collect::<Vec<_>>(),
        )
        .unwrap()
    }

    #[test]
    fn concurrent_writers_converge_in_index_order() {
        let left = encoded(&[(0, 0, b"a"), (0, 2, b"c"), (1, 1, b"y")]);
        let right = encoded(&[(0, 1, b"b"), (0, 3, b"d"), (1, 0, b"x")]);
        let left_right = merge_encoded(8, &left, &right).unwrap();
        let right_left = merge_encoded(8, &right, &left).unwrap();
        assert_eq!(left_right, right_left);
        assert_eq!(
            decode_entries(&left_right, 8)
                .unwrap()
                .iter()
                .map(|entry| (entry.direction, entry.index))
                .collect::<Vec<_>>(),
            vec![(0, 0), (0, 1), (0, 2), (0, 3), (1, 0), (1, 1)]
        );
    }

    #[test]
    fn conflicts_and_retention_are_deterministic() {
        let left = encoded(&[
            (0, 0, b"old"),
            (0, 1, b"z"),
            (0, 2, b"two"),
        ]);
        let right = encoded(&[(0, 1, b"a"), (0, 3, b"three"), (0, 4, b"four")]);
        let merged = merge_encoded(3, &left, &right).unwrap();
        let entries = decode_entries(&merged, 3).unwrap();
        assert_eq!(
            entries
                .iter()
                .map(|entry| (entry.index, entry.payload.as_slice()))
                .collect::<Vec<_>>(),
            vec![(2, b"two".as_slice()), (3, b"three".as_slice()), (4, b"four".as_slice())]
        );
    }

    #[test]
    fn merge_is_associative_and_idempotent() {
        let first = encoded(&[(0, 0, b"a"), (0, 3, b"d")]);
        let second = encoded(&[(0, 1, b"b"), (1, 0, b"x")]);
        let third = encoded(&[(0, 2, b"c"), (1, 1, b"y")]);
        let first_second = merge_encoded(8, &first, &second).unwrap();
        let second_third = merge_encoded(8, &second, &third).unwrap();
        assert_eq!(
            merge_encoded(8, &first_second, &third).unwrap(),
            merge_encoded(8, &first, &second_third).unwrap()
        );
        assert_eq!(merge_encoded(8, &first, &first).unwrap(), first);
    }

    #[test]
    fn rejects_noncanonical_or_oversized_state() {
        let noncanonical = encoded(&[(0, 1, b"a"), (0, 2, b"b")]);
        let mut reordered = noncanonical.clone();
        reordered[17] = 2;
        reordered[29] = 1;
        assert!(decode_entries(&reordered, 8).is_err());
        assert!(decode_entries(&noncanonical, 1).is_err());
    }
}
