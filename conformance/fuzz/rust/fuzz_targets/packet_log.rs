#![no_main]
//! Packet-log contract: entry decoding, canonical re-encoding, and merge.
//!
//! `decode_entries` reads a length-prefixed entry list out of peer state. The
//! properties fuzzed here are the ones the encoder and decoder promise each
//! other and nothing checked:
//!
//!   * decode is total — every byte string is `Ok` or `Err`, never a panic;
//!   * the encoding is canonical — anything that decodes re-encodes to exactly
//!     the bytes it came from, so two nodes cannot hold the same log under two
//!     different byte strings and disagree about its hash;
//!   * merge is commutative and idempotent — a log replicated in a different
//!     order converges on one answer.
//!
//! Retention comes from the control byte rather than being fixed: it bounds the
//! entry count per direction, so a constant would leave the "retention
//! exceeded" path unreachable for the whole run.

use libfuzzer_sys::fuzz_target;
use twistedpear_freenet_packet_log_contract::{decode_entries, encode_entries, merge_encoded};

#[path = "../case.rs"]
mod case;

fuzz_target!(|data: &[u8]| {
    let Some(case) = case::Case::parse(data) else {
        return;
    };
    let retention = usize::from(case.control);
    let (left, right) = (case.left, case.right);

    let Ok(entries) = decode_entries(left, retention) else {
        // A rejected state still must not crash the merge path.
        let _ = merge_encoded(retention, left, right);
        return;
    };

    // Canonical: decode then encode is the identity on anything that decoded.
    let reencoded = encode_entries(&entries).expect("decoded entries must re-encode");
    assert_eq!(
        reencoded, left,
        "decode/encode is not canonical at retention {retention}"
    );

    let Ok(merged) = merge_encoded(retention, left, right) else {
        return;
    };

    // The merge output is itself a valid state, or the contract has just written
    // something no peer — including itself — will accept back.
    decode_entries(&merged, retention).expect("merge produced an undecodable state");

    assert_eq!(
        merge_encoded(retention, right, left).ok().as_deref(),
        Some(merged.as_slice()),
        "merge is not commutative at retention {retention}"
    );
    assert_eq!(
        merge_encoded(retention, &merged, &merged).ok().as_deref(),
        Some(merged.as_slice()),
        "merge is not idempotent at retention {retention}"
    );
});
