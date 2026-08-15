#![no_main]
//! Propagation-set contract: transient-id set decoding and union merge.
//!
//! This one holds queued LXMF messages for a destination, so its state arrives
//! from whichever propagation node last touched it. The properties are the same
//! three the packet log holds — totality, a canonical encoding, and a merge that
//! converges regardless of arrival order — because a set that merged differently
//! on two nodes would silently drop queued messages for one of them.

use libfuzzer_sys::fuzz_target;
use twistedpear_freenet_propagation_set_contract::{decode_entries, encode_entries, merge_encoded};

#[path = "../case.rs"]
mod case;

fuzz_target!(|data: &[u8]| {
    let Some(case) = case::Case::parse(data) else {
        return;
    };
    let (left, right) = (case.left, case.right);

    let Ok(entries) = decode_entries(left) else {
        let _ = merge_encoded(left, right);
        return;
    };

    let reencoded = encode_entries(&entries).expect("decoded entries must re-encode");
    assert_eq!(reencoded, left, "decode/encode is not canonical");

    let Ok(merged) = merge_encoded(left, right) else {
        return;
    };

    decode_entries(&merged).expect("merge produced an undecodable state");

    assert_eq!(
        merge_encoded(right, left).ok().as_deref(),
        Some(merged.as_slice()),
        "merge is not commutative"
    );
    assert_eq!(
        merge_encoded(&merged, &merged).ok().as_deref(),
        Some(merged.as_slice()),
        "merge is not idempotent"
    );
});
