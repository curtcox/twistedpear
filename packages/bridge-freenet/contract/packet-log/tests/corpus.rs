//! Replay the committed fuzz corpus on the pinned stable toolchain.
//!
//! `cargo fuzz` needs a nightly compiler, so the fuzzing gate is nightly-tier
//! and cannot protect a pull request. This test can: it reads the same
//! `conformance/fuzz/rust/corpus/packet-log` directory libFuzzer is given —
//! generated seeds and every counterexample a session ever found — and holds the
//! same properties over it, on the compiler `rust-tests` already runs.
//!
//! The counterexample this was written for is `crash-oom-a03beabd…`: nine bytes
//! of state whose count field claimed four billion entries, which the decoder
//! obligingly reserved capacity for.

#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::unreachable
)]

use twistedpear_freenet_packet_log_contract::{decode_entries, encode_entries, merge_encoded};

#[path = "../../../../../conformance/fuzz/rust/peak_alloc.rs"]
mod peak_alloc;

#[path = "../../../../../conformance/fuzz/rust/case.rs"]
mod case;

#[global_allocator]
static ALLOCATOR: peak_alloc::PeakAlloc = peak_alloc::PeakAlloc;

#[test]
fn every_committed_case_decodes_canonically_and_merges_convergently() {
    let cases = case::load("packet-log");
    assert!(!cases.is_empty(), "the committed corpus is empty");

    for (name, bytes) in &cases {
        let Some(case) = case::Case::parse(bytes) else {
            continue;
        };
        let retention = usize::from(case.control);

        let Ok(entries) = decode_entries(case.left, retention) else {
            // A rejected state still must not crash the merge path.
            let _ = merge_encoded(retention, case.left, case.right);
            continue;
        };

        assert_eq!(
            encode_entries(&entries).expect("decoded entries must re-encode"),
            case.left,
            "{name}: decode/encode is not canonical at retention {retention}"
        );

        let Ok(merged) = merge_encoded(retention, case.left, case.right) else {
            continue;
        };
        decode_entries(&merged, retention)
            .unwrap_or_else(|_| panic!("{name}: merge produced an undecodable state"));
        assert_eq!(
            merge_encoded(retention, case.right, case.left)
                .ok()
                .as_deref(),
            Some(merged.as_slice()),
            "{name}: merge is not commutative"
        );
    }
}

#[test]
fn a_count_field_larger_than_the_buffer_reserves_nothing_absurd() {
    // Nine bytes: the magic, then a saturated count. Before the fix this
    // reserved capacity for `u32::MAX` entries.
    //
    // Asserting only that it returns an error would prove nothing: it always
    // did, which is why the bug survived a hand-written unit suite. The
    // allocation is the thing that changed, so the allocation is what this
    // measures — see `conformance/fuzz/rust/peak_alloc.rs`.
    let mut state = b"TPLG".to_vec();
    state.push(0x01);
    state.extend_from_slice(&u32::MAX.to_be_bytes());

    let (result, largest) =
        peak_alloc::largest_allocation_during(|| decode_entries(&state, 8).is_err());
    assert!(result, "a saturated count must still be rejected");
    assert!(
        largest < 64 * 1024,
        "decoding nine bytes asked for {largest} bytes in one allocation"
    );
}
