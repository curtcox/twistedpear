//! Replay the committed fuzz corpus on the pinned stable toolchain.
//!
//! `cargo fuzz` needs a nightly compiler, so the fuzzing gate is nightly-tier
//! and cannot protect a pull request. This test can: it reads the same
//! `conformance/fuzz/rust/corpus/locator` directory libFuzzer is given and holds
//! the properties the contract promises — validation is total, update is closed
//! under validation, and merge converges regardless of arrival order.

#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::unreachable
)]

use freenet_stdlib::prelude::{
    ContractInterface, Parameters, RelatedContracts, State, UpdateData, ValidateResult,
};
use twistedpear_freenet_locator_contract::LocatorContract;

#[path = "../../../../../conformance/fuzz/rust/case.rs"]
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

#[test]
fn every_committed_case_validates_totally_and_merges_convergently() {
    let cases = case::load("locator");
    assert!(!cases.is_empty(), "the committed corpus is empty");

    for (name, bytes) in &cases {
        let Some(case) = case::Case::parse(bytes) else {
            continue;
        };
        let parameters = vec![0xaa; usize::from(case.control)];

        validate(&parameters, case.left);
        validate(&parameters, case.right);

        let Some(merged) = merge(&parameters, case.left, case.right) else {
            continue;
        };
        assert_eq!(
            validate(&parameters, &merged),
            ValidateResult::Valid,
            "{name}: update_state produced a state its own validator rejects"
        );
        if let Some(swapped) = merge(&parameters, case.right, case.left) {
            assert_eq!(merged, swapped, "{name}: merge is not commutative");
        }
    }
}
