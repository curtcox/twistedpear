export function testEgressFactory(sent: Uint8Array[] = []) {
  return {
    async create(input: {
      admission: {
        plane: "webrtc" | "pears-bulk" | "reticulum" | "lxmf" | "cas";
      };
    }) {
      return {
        plane: input.admission.plane,
        async send(frame: Uint8Array) {
          sent.push(frame);
          return { queuedBytes: 0, droppedOldest: 0 };
        },
        quality() {
          return {
            goodputBps: 64_000,
            rttMs: 10,
            jitterMs: 1,
            lossRatio: 0,
            mtu: 1_200,
            source: "declared" as const,
            samples: 0,
            confidence: "low" as const,
          };
        },
        async close() {},
      };
    },
  };
}
