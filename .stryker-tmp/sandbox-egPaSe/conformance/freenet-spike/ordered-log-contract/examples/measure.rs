use std::hint::black_box;
use std::time::Instant;
use twistedpear_freenet_ordered_log_spike::{
    decode_entries, encode_entries, merge_encoded, LogEntry,
};

fn state(direction: u8, indexes: impl Iterator<Item = u64>, payload_bytes: usize) -> Vec<u8> {
    encode_entries(
        &indexes
            .map(|index| LogEntry {
                direction,
                index,
                payload: vec![(index & 0xff) as u8; payload_bytes],
            })
            .collect::<Vec<_>>(),
    )
    .unwrap()
}

fn percentile(sorted: &[f64], quantile: f64) -> f64 {
    sorted[((sorted.len() as f64 * quantile).ceil() as usize).saturating_sub(1)]
}

fn main() {
    let capacities = [16usize, 64, 256];
    let payload_sizes = [64usize, 500];
    let trials = 200usize;
    let mut rows = Vec::new();

    for capacity in capacities {
        for payload_bytes in payload_sizes {
            let left = state(0, (0..capacity as u64 * 2).step_by(2), payload_bytes);
            let right = state(0, (1..capacity as u64 * 2).step_by(2), payload_bytes);
            let merged = merge_encoded(capacity, &left, &right).unwrap();
            let other_direction =
                state(1, 0..capacity as u64, payload_bytes);
            let bidirectional =
                merge_encoded(capacity, &merged, &other_direction).unwrap();
            let mut timings = Vec::with_capacity(trials);
            for _ in 0..trials {
                let started = Instant::now();
                black_box(merge_encoded(capacity, &left, &right).unwrap());
                timings.push(started.elapsed().as_secs_f64() * 1_000.0);
            }
            timings.sort_by(f64::total_cmp);
            rows.push((
                capacity,
                payload_bytes,
                left.len(),
                merged.len(),
                bidirectional.len(),
                percentile(&timings, 0.5),
                percentile(&timings, 0.95),
                *timings.last().unwrap(),
            ));
        }
    }

    let even = state(0, [0, 2, 4].into_iter(), 8);
    let odd = state(0, [1, 3, 5].into_iter(), 8);
    let forward = merge_encoded(8, &even, &odd).unwrap();
    let reverse = merge_encoded(8, &odd, &even).unwrap();
    let indexes = decode_entries(&forward, 8)
        .unwrap()
        .into_iter()
        .map(|entry| entry.index)
        .collect::<Vec<_>>();

    println!("{{");
    println!("  \"schemaVersion\": 1,");
    println!("  \"trialsPerCase\": {trials},");
    println!("  \"entryOverheadBytes\": 11,");
    println!("  \"stateHeaderBytes\": 9,");
    println!("  \"concurrentWriterEvidence\": {{");
    println!("    \"commutative\": {},", forward == reverse);
    println!("    \"orderedIndexes\": {:?},", indexes);
    println!("    \"gapDetectionRequired\": true,");
    println!("    \"sameIndexConflictRule\": \"lexicographically-smaller-payload\"");
    println!("  }},");
    println!("  \"growthAndMergeCost\": [");
    for (position, row) in rows.iter().enumerate() {
        println!(
            "    {{\"retentionPerDirection\":{},\"payloadBytes\":{},\"oneWriterStateBytes\":{},\"retainedDirectionStateBytes\":{},\"bidirectionalStateBytes\":{},\"mergeP50Ms\":{:.6},\"mergeP95Ms\":{:.6},\"mergeMaxMs\":{:.6}}}{}",
            row.0,
            row.1,
            row.2,
            row.3,
            row.4,
            row.5,
            row.6,
            row.7,
            if position + 1 == rows.len() { "" } else { "," }
        );
    }
    println!("  ]");
    println!("}}");
}
