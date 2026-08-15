// A global allocator that remembers the largest single request.
//
// The obvious test for "the decoder no longer reserves four billion entries" is
// that it returns an error — and that test passes with the bug still in, because
// it always did return an error. The over-reservation is invisible from the
// outside on a host that over-commits: `Vec::with_capacity(4_294_967_295)`
// succeeds on macOS and Linux, the pages are never touched, and RSS never moves.
// libFuzzer sees it only because `-malloc_limit_mb` instruments malloc itself.
//
// So does this. Installed as the test binary's `#[global_allocator]`, it records
// the largest size ever asked for, which lets a stable-toolchain test assert the
// thing that actually changed rather than the thing that did not.
//
// Pulled in by `#[path]` from the contracts that need it, one definition, for
// the same reason `case.rs` is: a copy per crate is a copy per crate to drift.
#![allow(dead_code)]

use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering};

pub struct PeakAlloc;

static PEAK: AtomicUsize = AtomicUsize::new(0);

unsafe impl GlobalAlloc for PeakAlloc {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        PEAK.fetch_max(layout.size(), Ordering::Relaxed);
        unsafe { System.alloc(layout) }
    }

    unsafe fn dealloc(&self, pointer: *mut u8, layout: Layout) {
        unsafe { System.dealloc(pointer, layout) }
    }

    unsafe fn realloc(&self, pointer: *mut u8, layout: Layout, new_size: usize) -> *mut u8 {
        PEAK.fetch_max(new_size, Ordering::Relaxed);
        unsafe { System.realloc(pointer, layout, new_size) }
    }
}

/// Run `body`, and report the largest single allocation it asked for.
///
/// Single-threaded by construction: the counter is process-wide, so a test that
/// measured it while another test allocated would report the other test's
/// number. `cargo test` runs test functions in parallel, hence the lock.
pub fn largest_allocation_during<T>(body: impl FnOnce() -> T) -> (T, usize) {
    static LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let guard = LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    PEAK.store(0, Ordering::Relaxed);
    let value = body();
    let peak = PEAK.load(Ordering::Relaxed);
    drop(guard);
    (value, peak)
}
