# BLE/LoRa simulation calibration

This directory converts guarded hardware measurements or independently recorded deployment traces
into reviewable parameters for the deterministic transport models. It does not treat simulated,
emulated, or hand-authored observations as physical evidence.

## Evidence contract

Trace files must conform to `trace.schema.json` and identify the hardware, exact software/firmware,
radio configuration, environment, source, and recording time. Each observation records a monotonic
sequence number, payload size, send timestamp, and receive timestamp. A `null` receive timestamp is
a loss. Use a monotonic clock at both ends with a measured synchronization error smaller than the
latency tolerance, or record both timestamps on a single observing host.

Collect at least the sample and payload-size counts pre-registered in `policy.json`. Payload sizes
must span the normal operating range rather than repeating a single convenient size. Preserve the
raw trace: the report includes its SHA-256 digest.

## Generate and review a report

```bash
npm run calibrate:sim-transport -- path/to/ble-trace.json --output conformance/sim-calibration/ble-report.json
npm run calibrate:sim-transport -- path/to/lora-trace.json --output conformance/sim-calibration/lora-report.json
```

The fitter estimates serialization bandwidth with a robust median pairwise slope across payload-size
duration medians, uses the fifth and
ninety-fifth percentiles of the residual as the uniform latency envelope, calculates observed loss,
and derives loss-burst transitions from consecutive outcomes. It then compares those values with the
shipping simulation preset. A tolerance failure is evidence that the preset needs a reviewed update,
not a reason to discard the trace or relax the pre-registered policy.

Version the raw traces and reports together. Update `transport-classes.ts` only after reviewing trace
provenance, clock error, sample coverage, and environmental representativeness. Repeat with at least
one materially different device/setting before making a general physical-layer claim.

## Minimum guarded runs

- BLE: two physical phones, foreground and background intervals, at least four payload sizes, and
  reconnect/interference stretches. Record negotiated MTU/PHY and OS/device versions.
- LoRa: two physical RNodes carrying Reticulum traffic, at least four payload sizes and representative
  RF settings/distances. Record frequency, bandwidth, spreading factor, coding rate, power, firmware,
  antenna/environment, and configured duty cycle.

Until both accepted reports and their raw traces are committed, simulator results remain behavioral
models and must not be described as BLE/LoRa physical-layer accuracy.
