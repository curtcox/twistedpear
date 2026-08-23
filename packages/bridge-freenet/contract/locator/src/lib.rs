use freenet_stdlib::prelude::*;

const T256_LENGTH: usize = 94;
const STATE_MAGIC: &[u8] = b"TPFL\x01";
const HEADER_LENGTH: usize = 11;

pub struct LocatorContract;

fn valid_shape(parameters: &Parameters<'_>, state: &State<'_>) -> bool {
    let bytes = state.as_ref();
    parameters.as_ref().len() == T256_LENGTH
        && bytes.len() >= HEADER_LENGTH
        && bytes.starts_with(STATE_MAGIC)
        && {
            let locator_len = u16::from_be_bytes([bytes[5], bytes[6]]) as usize;
            let archive_len =
                u32::from_be_bytes([bytes[7], bytes[8], bytes[9], bytes[10]]) as usize;
            HEADER_LENGTH
                .checked_add(locator_len)
                .and_then(|length| length.checked_add(archive_len))
                == Some(bytes.len())
        }
}

fn merge_candidate(
    parameters: &Parameters<'_>,
    current: &mut Vec<u8>,
    candidate: &[u8],
) -> Result<(), ContractError> {
    let candidate_state = State::from(candidate.to_vec());
    if !valid_shape(parameters, &candidate_state) {
        return Err(ContractError::InvalidUpdate);
    }

    // Conflicting puts converge deterministically. TwistedPear still verifies
    // the signed locator, package hash, and manifest signature after fetching.
    if current.is_empty() || candidate < current.as_slice() {
        current.clear();
        current.extend_from_slice(candidate);
    }
    Ok(())
}

#[contract]
impl ContractInterface for LocatorContract {
    fn validate_state(
        parameters: Parameters<'static>,
        state: State<'static>,
        _related: RelatedContracts<'static>,
    ) -> Result<ValidateResult, ContractError> {
        Ok(if valid_shape(&parameters, &state) {
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
        let mut merged = state.as_ref().to_vec();
        if !merged.is_empty() && !valid_shape(&parameters, &state) {
            return Err(ContractError::InvalidUpdate);
        }

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

    fn state(byte: u8) -> State<'static> {
        let mut bytes = vec![0; HEADER_LENGTH + 1];
        bytes[..STATE_MAGIC.len()].copy_from_slice(STATE_MAGIC);
        bytes[10] = 1;
        bytes[11] = byte;
        State::from(bytes)
    }

    #[test]
    fn validates_shape_and_converges_conflicts() {
        let params = Parameters::from(vec![b'x'; T256_LENGTH]);
        assert_eq!(
            LocatorContract::validate_state(params.clone(), state(2), RelatedContracts::default())
                .unwrap(),
            ValidateResult::Valid
        );

        let left = LocatorContract::update_state(
            params.clone(),
            state(2),
            vec![UpdateData::State(state(1))],
        )
        .unwrap()
        .unwrap_valid();
        let right =
            LocatorContract::update_state(params, state(1), vec![UpdateData::State(state(2))])
                .unwrap()
                .unwrap_valid();
        assert_eq!(left.as_ref(), right.as_ref());
    }
}
