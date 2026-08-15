// The wire layout of a fuzz case, and the reader for the committed corpus.
//
// One file, pulled in by `#[path]` from four crates: the three fuzz targets in
// this directory and the corpus-replay test in each contract. Writing it out
// per crate would be four copies of the same twenty lines for the duplication
// gate to find, and — worse — four places for the layout to drift, which would
// silently reinterpret every committed corpus file.
//
// The layout is explicit on purpose. The first version derived cases with
// `#[derive(Arbitrary)]`, which builds them fine and cannot be seeded:
// `Arbitrary` takes collection lengths off the end of the buffer in an order
// that is an implementation detail, so there is no way to write down "here is a
// valid contract state" as a corpus file. That mattered. Every one of these
// decoders opens with a five-byte magic (`TPFL\x01`, `TPLG\x01`, `TPPS\x01`),
// drawing which from random bytes is a 2^-40 event; a 20 000-run session spent
// every input bouncing off the header check, growing coverage in the harness and
// none at all in the contract. A fuzzer that cannot enter the code it targets is
// the "measurement that cannot fail" in another costume.
//
//     byte 0      control (retention, or parameter length)
//     bytes 1..3  big-endian length of the left side
//     bytes 3..   left side, then whatever remains is the right side
//
// `conformance/fuzz/rust/seeds.mjs` writes seeds in this layout.
#![allow(dead_code)]

/// One fuzz case: a control byte and two byte strings.
pub struct Case<'a> {
    pub control: u8,
    pub left: &'a [u8],
    pub right: &'a [u8],
}

impl<'a> Case<'a> {
    /// `None` for inputs too short to carry a header, which libFuzzer produces
    /// constantly early in a run and which say nothing about the contract.
    pub fn parse(data: &'a [u8]) -> Option<Self> {
        if data.len() < 3 {
            return None;
        }
        let rest = &data[3..];
        // Clamped rather than rejected: a length past the end is exactly the
        // kind of input worth keeping, and rejecting it would throw away every
        // mutation that shortened the buffer without fixing the prefix.
        let split = usize::from(u16::from_be_bytes([data[1], data[2]])).min(rest.len());
        Some(Case {
            control: data[0],
            left: &rest[..split],
            right: &rest[split..],
        })
    }
}

/// Every committed case for one target, as `(file name, bytes)`, sorted so a
/// failure names the same file on every machine.
///
/// The corpus is found by walking up from the crate being built rather than by
/// a fixed relative path, because the four crates that include this file sit at
/// three different depths.
pub fn load(target: &str) -> Vec<(String, Vec<u8>)> {
    let mut directory = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let corpus = loop {
        let candidate = directory.join("conformance/fuzz/rust/corpus").join(target);
        if candidate.is_dir() {
            break candidate;
        }
        assert!(
            directory.pop(),
            "no conformance/fuzz/rust/corpus/{target} above {}",
            env!("CARGO_MANIFEST_DIR")
        );
    };

    let mut cases = std::fs::read_dir(&corpus)
        .unwrap_or_else(|error| panic!("cannot read {}: {error}", corpus.display()))
        .filter_map(|entry| {
            let path = entry.ok()?.path();
            if !path.is_file() {
                return None;
            }
            Some((
                path.file_name()?.to_string_lossy().into_owned(),
                std::fs::read(&path).ok()?,
            ))
        })
        .collect::<Vec<_>>();
    cases.sort_by(|left, right| left.0.cmp(&right.0));
    cases
}
