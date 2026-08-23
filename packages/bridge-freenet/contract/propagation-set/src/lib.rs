use freenet_stdlib::prelude::*;
use std::collections::BTreeMap;

const STATE_MAGIC: &[u8] = b"TPPS\x01";
const HEADER_LENGTH: usize = 9;
const DESTINATION_HASH_BYTES: usize = 16;
const TRANSIENT_ID_BYTES: usize = 32;
const ENTRY_FIXED_LENGTH: usize = TRANSIENT_ID_BYTES + 8 + 4;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PropagationEntry {
    pub transient_id: [u8; TRANSIENT_ID_BYTES],
    pub stored_at: u64,
    pub lxmf_data: Vec<u8>,
}

fn valid_parameters(parameters: &[u8]) -> bool {
    parameters.len() == DESTINATION_HASH_BYTES
}

pub fn encode_entries(entries: &[PropagationEntry]) -> Result<Vec<u8>, &'static str> {
    let count = u32::try_from(entries.len()).map_err(|_| "too many entries")?;
    let mut out = Vec::with_capacity(
        HEADER_LENGTH
            + entries
                .iter()
                .map(|entry| ENTRY_FIXED_LENGTH + entry.lxmf_data.len())
                .sum::<usize>(),
    );
    out.extend_from_slice(STATE_MAGIC);
    out.extend_from_slice(&count.to_be_bytes());
    let mut previous: Option<[u8; TRANSIENT_ID_BYTES]> = None;
    for entry in entries {
        if entry.lxmf_data.len() > u32::MAX as usize {
            return Err("message too large");
        }
        if previous.is_some_and(|value| value >= entry.transient_id) {
            return Err("entries not canonical");
        }
        previous = Some(entry.transient_id);
        out.extend_from_slice(&entry.transient_id);
        out.extend_from_slice(&entry.stored_at.to_be_bytes());
        out.extend_from_slice(&(entry.lxmf_data.len() as u32).to_be_bytes());
        out.extend_from_slice(&entry.lxmf_data);
    }
    Ok(out)
}

/// The most entries a state of this size could contain, since every entry costs
/// at least its transient id, timestamp and length prefix.
fn max_entries(state_length: usize) -> usize {
    state_length.saturating_sub(HEADER_LENGTH) / ENTRY_FIXED_LENGTH
}

pub fn decode_entries(bytes: &[u8]) -> Result<Vec<PropagationEntry>, &'static str> {
    if bytes.len() < HEADER_LENGTH || !bytes.starts_with(STATE_MAGIC) {
        return Err("invalid state header");
    }
    let count = u32::from_be_bytes([bytes[5], bytes[6], bytes[7], bytes[8]]) as usize;
    let mut cursor = HEADER_LENGTH;
    // Reserve for what the buffer could actually hold, not for what its header
    // claims — see the same fix in the packet-log contract. Nine bytes of state
    // asked for four billion 64-byte entries here; `cargo fuzz` reported it as
    // an out-of-memory on the `count-overrun` seed. Which inputs are accepted is
    // unchanged: the loop still errors on the first entry past the end.
    let mut entries = Vec::with_capacity(count.min(max_entries(bytes.len())));
    let mut previous: Option<[u8; TRANSIENT_ID_BYTES]> = None;
    for _ in 0..count {
        let header_end = cursor
            .checked_add(ENTRY_FIXED_LENGTH)
            .ok_or("entry length overflow")?;
        if header_end > bytes.len() {
            return Err("truncated entry header");
        }
        let mut transient_id = [0u8; TRANSIENT_ID_BYTES];
        transient_id.copy_from_slice(&bytes[cursor..cursor + TRANSIENT_ID_BYTES]);
        if previous.is_some_and(|value| value >= transient_id) {
            return Err("entries not canonical");
        }
        previous = Some(transient_id);
        let stored_at = u64::from_be_bytes(
            bytes[cursor + TRANSIENT_ID_BYTES..cursor + TRANSIENT_ID_BYTES + 8]
                .try_into()
                .map_err(|_| "invalid storedAt")?,
        );
        let lxmf_length = u32::from_be_bytes(
            bytes[cursor + TRANSIENT_ID_BYTES + 8..header_end]
                .try_into()
                .map_err(|_| "invalid lxmf length")?,
        ) as usize;
        let payload_end = header_end
            .checked_add(lxmf_length)
            .ok_or("payload length overflow")?;
        if payload_end > bytes.len() {
            return Err("truncated message");
        }
        entries.push(PropagationEntry {
            transient_id,
            stored_at,
            lxmf_data: bytes[header_end..payload_end].to_vec(),
        });
        cursor = payload_end;
    }
    if cursor != bytes.len() {
        return Err("trailing state bytes");
    }
    Ok(entries)
}

fn prefer_entry(left: &PropagationEntry, right: &PropagationEntry) -> PropagationEntry {
    if left.stored_at < right.stored_at {
        return left.clone();
    }
    if right.stored_at < left.stored_at {
        return right.clone();
    }
    if left.lxmf_data <= right.lxmf_data {
        left.clone()
    } else {
        right.clone()
    }
}

pub fn merge_encoded(left: &[u8], right: &[u8]) -> Result<Vec<u8>, &'static str> {
    let mut merged = BTreeMap::<[u8; TRANSIENT_ID_BYTES], PropagationEntry>::new();
    for entry in decode_entries(left)?
        .into_iter()
        .chain(decode_entries(right)?)
    {
        merged
            .entry(entry.transient_id)
            .and_modify(|existing| *existing = prefer_entry(existing, &entry))
            .or_insert(entry);
    }
    encode_entries(&merged.into_values().collect::<Vec<_>>())
}

fn merge_candidate(
    parameters: &Parameters<'_>,
    current: &mut Vec<u8>,
    candidate: &[u8],
) -> Result<(), ContractError> {
    if !valid_parameters(parameters.as_ref()) {
        return Err(ContractError::InvalidUpdate);
    }
    if current.is_empty() {
        decode_entries(candidate).map_err(|_| ContractError::InvalidUpdate)?;
        current.extend_from_slice(candidate);
        return Ok(());
    }
    *current = merge_encoded(current, candidate).map_err(|_| ContractError::InvalidUpdate)?;
    Ok(())
}

pub struct PropagationSetContract;

#[contract]
impl ContractInterface for PropagationSetContract {
    fn validate_state(
        parameters: Parameters<'static>,
        state: State<'static>,
        _related: RelatedContracts<'static>,
    ) -> Result<ValidateResult, ContractError> {
        let valid = valid_parameters(parameters.as_ref()) && decode_entries(state.as_ref()).is_ok();
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
        if !valid_parameters(parameters.as_ref()) {
            return Err(ContractError::InvalidUpdate);
        }
        if !state.as_ref().is_empty() {
            decode_entries(state.as_ref()).map_err(|_| ContractError::InvalidUpdate)?;
        }
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

// A test asserting a known-good decode is entitled to unwrap: the panic *is*
// the assertion, and its blast radius is the test runner rather than a node
// executing a contract. The crate-level denials in Cargo.toml exist for the
// shipped paths, so the opt-out is scoped here rather than weakened there.
#[allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::unreachable
)]
#[cfg(test)]
mod tests {
    use super::*;

    fn entry(suffix: u8, stored_at: u64, payload: &[u8]) -> PropagationEntry {
        let mut transient_id = [0u8; TRANSIENT_ID_BYTES];
        transient_id[31] = suffix;
        PropagationEntry {
            transient_id,
            stored_at,
            lxmf_data: payload.to_vec(),
        }
    }

    fn encoded(entries: &[PropagationEntry]) -> Vec<u8> {
        encode_entries(entries).unwrap()
    }

    #[test]
    fn concurrent_writers_union_by_transient_id() {
        let left = encoded(&[entry(1, 100, b"msg-a"), entry(3, 300, b"msg-c")]);
        let right = encoded(&[entry(2, 200, b"msg-b"), entry(3, 250, b"msg-c-earlier")]);
        let left_right = merge_encoded(&left, &right).unwrap();
        let right_left = merge_encoded(&right, &left).unwrap();
        assert_eq!(left_right, right_left);
        let entries = decode_entries(&left_right).unwrap();
        assert_eq!(
            entries
                .iter()
                .map(|entry| (
                    entry.transient_id[31],
                    entry.stored_at,
                    entry.lxmf_data.as_slice()
                ))
                .collect::<Vec<_>>(),
            vec![
                (1, 100, b"msg-a".as_slice()),
                (2, 200, b"msg-b".as_slice()),
                (3, 250, b"msg-c-earlier".as_slice()),
            ]
        );
    }

    #[test]
    fn earlier_stored_at_and_lexicographic_tiebreak() {
        let left = encoded(&[entry(1, 200, b"zz")]);
        let right = encoded(&[entry(1, 200, b"aa")]);
        let merged = merge_encoded(&left, &right).unwrap();
        assert_eq!(decode_entries(&merged).unwrap()[0].lxmf_data, b"aa");
    }

    #[test]
    fn merge_is_associative_and_idempotent() {
        let first = encoded(&[entry(1, 10, b"a")]);
        let second = encoded(&[entry(2, 20, b"b")]);
        let third = encoded(&[entry(3, 30, b"c")]);
        let first_second = merge_encoded(&first, &second).unwrap();
        let second_third = merge_encoded(&second, &third).unwrap();
        assert_eq!(
            merge_encoded(&first_second, &third).unwrap(),
            merge_encoded(&first, &second_third).unwrap()
        );
        assert_eq!(merge_encoded(&first, &first).unwrap(), first);
    }

    #[test]
    fn validates_parameters_and_rejects_noncanonical() {
        let params = Parameters::from(vec![0xab; DESTINATION_HASH_BYTES]);
        let state = State::from(encoded(&[entry(1, 1, b"ok")]));
        assert_eq!(
            PropagationSetContract::validate_state(
                params.clone(),
                state.clone(),
                RelatedContracts::default()
            )
            .unwrap(),
            ValidateResult::Valid
        );
        assert_eq!(
            PropagationSetContract::validate_state(
                Parameters::from(vec![0u8; 8]),
                state,
                RelatedContracts::default()
            )
            .unwrap(),
            ValidateResult::Invalid
        );

        let good = encoded(&[entry(1, 1, b"a"), entry(2, 2, b"b")]);
        let mut bad = good.clone();
        let first_start = HEADER_LENGTH;
        let second_start = HEADER_LENGTH + ENTRY_FIXED_LENGTH + 1;
        let first_id = bad[first_start..first_start + TRANSIENT_ID_BYTES].to_vec();
        let second_id = bad[second_start..second_start + TRANSIENT_ID_BYTES].to_vec();
        bad[first_start..first_start + TRANSIENT_ID_BYTES].copy_from_slice(&second_id);
        bad[second_start..second_start + TRANSIENT_ID_BYTES].copy_from_slice(&first_id);
        assert!(decode_entries(&bad).is_err());
    }
}
