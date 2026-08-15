#![no_main]
//! Locator contract: shape validation and conflict convergence.
//!
//! The contract parses state that arrives from any peer on the network, so
//! "does not panic" is the floor, not the ceiling — a contract that traps takes
//! the node's WASM instance down with it. The properties below are the ones the
//! contract promises and nothing checked:
//!
//!   * validation is total: every byte string is Valid or Invalid, never a trap;
//!   * update is closed: a state that came out of `update_state` validates;
//!   * merge converges: conflicting puts agree on one answer regardless of
//!     which side arrives first, which is the whole reason the contract keeps
//!     the lexicographically smaller candidate.
//!
//! Convergence is the property worth fuzzing. Two nodes that disagree about the
//! merged state of a locator do not fail loudly; they serve different packages
//! under the same address until someone notices.

use freenet_stdlib::prelude::{
    ContractInterface, Parameters, RelatedContracts, State, UpdateData, ValidateResult,
};
use libfuzzer_sys::fuzz_target;
use twistedpear_freenet_locator_contract::LocatorContract;

#[path = "../case.rs"]
mod case;

fn validate(parameters: &[u8], state: &[u8]) -> ValidateResult {
    LocatorContract::validate_state(
        Parameters::from(parameters.to_vec()),
        State::from(state.to_vec()),
        RelatedContracts::default(),
    )
    .expect("validate_state must classify, not error")
}

fn merge(parameters: &[u8], state: &[u8], candidate: &[u8]) -> Option<Vec<u8>> {
    LocatorContract::update_state(
        Parameters::from(parameters.to_vec()),
        State::from(state.to_vec()),
        vec![UpdateData::State(State::from(candidate.to_vec()))],
    )
    .ok()
    .map(|modification| modification.unwrap_valid().as_ref().to_vec())
}

fuzz_target!(|data: &[u8]| {
    let Some(case) = case::Case::parse(data) else {
        return;
    };
    // The only thing the contract asks of its parameters is a length, so the
    // first byte picks one directly rather than spending input bytes on 94
    // values none of which are read.
    let parameters = vec![0xaa; usize::from(case.control)];
    let (state, candidate) = (case.left, case.right);

    // Total: no input reaches a panic or an error return.
    validate(&parameters, state);
    validate(&parameters, candidate);

    let Some(merged) = merge(&parameters, state, candidate) else {
        return;
    };

    // Closed: what update produces, validation accepts. A contract that emits a
    // state its own validator rejects has poisoned the address for every peer
    // that fetches it next.
    assert_eq!(
        validate(&parameters, &merged),
        ValidateResult::Valid,
        "update_state produced a state its own validator rejects: {merged:02x?}"
    );

    // Convergent: order of arrival does not change the answer.
    if let Some(swapped) = merge(&parameters, candidate, state) {
        assert_eq!(
            merged, swapped,
            "merge is not commutative for {state:02x?} and {candidate:02x?}"
        );
    }

    // Idempotent: re-applying a candidate already merged in changes nothing.
    if let Some(again) = merge(&parameters, &merged, candidate) {
        assert_eq!(
            merged, again,
            "merge is not idempotent for {candidate:02x?}"
        );
    }
});
