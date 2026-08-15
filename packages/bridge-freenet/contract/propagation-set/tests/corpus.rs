//! Replay the committed fuzz corpus on the pinned stable toolchain.
//!
//! `cargo fuzz` needs a nightly compiler, so the fuzzing gate is nightly-tier
//! and cannot protect a pull request. This test can: it reads the same
//! `conformance/fuzz/rust/corpus/propagation-set` directory libFuzzer is given —
//! generated seeds and every counterexample a session ever found — and holds the
//! same properties over it, on the compiler `rust-tests` already runs.

use twistedpear_freenet_propagation_set_contract::{decode_entries, encode_entries, merge_encoded};

#[path = "../../../../../conformance/fuzz/rust/peak_alloc.rs"]
mod peak_alloc;

#[path = "../../../../../conformance/fuzz/rust/case.rs"]
mod case;

#[test]
fn every_committed_case_decodes_canonically_and_merges_convergently() {
    let cases = case::load("propagation-set");
    assert!(!cases.is_empty(), "the committed corpus is empty");

    for (name, bytes) in &cases {
        let Some(case) = case::Case::parse(bytes) else {
            continue;
        };

        let Ok(entries) = decode_entries(case.left) else {
            let _ = merge_encoded(case.left, case.right);
            continue;
        };

        assert_eq!(
            encode_entries(&entries).expect("decoded entries must re-encode"),
            case.left,
            "{name}: decode/encode is not canonical"
        );

        let Ok(merged) = merge_encoded(case.left, case.right) else {
            continue;
        };
        decode_entries(&merged)
            .unwrap_or_else(|_| panic!("{name}: merge produced an undecodable state"));
        assert_eq!(
            merge_encoded(case.right, case.left).ok().as_deref(),
            Some(merged.as_slice()),
            "{name}: merge is not commutative"
        );
    }
}

#[global_allocator]
static ALLOCATOR: peak_alloc::PeakAlloc = peak_alloc::PeakAlloc;

#[test]
fn a_count_field_larger_than_the_buffer_reserves_nothing_absurd() {
    // Nine bytes: the magic, then a saturated count. Before the fix this
    // reserved capacity for `u32::MAX` 64-byte entries — 274 GB.
    //
    // Asserting only that it returns an error would prove nothing: it always
    // did. The over-reservation is invisible from the outside because the host
    // allocator over-commits, so the allocation is what has to be measured.
    let mut state = b"TPPS".to_vec();
    state.push(0x01);
    state.extend_from_slice(&u32::MAX.to_be_bytes());

    let (result, largest) =
        peak_alloc::largest_allocation_during(|| decode_entries(&state).is_err());
    assert!(result, "a saturated count must still be rejected");
    assert!(
        largest < 64 * 1024,
        "decoding nine bytes asked for {largest} bytes in one allocation"
    );
}
