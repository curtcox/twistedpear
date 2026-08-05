/**
 * Test-agent-only manual pairing bus: exchange invitation codes over the
 * control channel instead of trusted chrome UI, and auto-approve confirm.
 */

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

export function createHarnessPeerPair() {
  let enabled = false;
  /** @type {ReturnType<typeof deferred> | null} */
  let outbound = null;
  /** @type {ReturnType<typeof deferred> | null} */
  let inbound = null;
  /** @type {{ handleId: string; dataPlane: string; fingerprint: string; displayLabel: string } | null} */
  let result = null;
  /** @type {Error | null} */
  let error = null;
  /** @type {Promise<unknown> | null} */
  let inflight = null;

  const resetExchange = () => {
    outbound = deferred();
    inbound = deferred();
  };

  const channel = {
    async *offer(session, code, options) {
      if (!enabled) throw new Error("Harness peer pair is not enabled");
      outbound?.resolve({ sessionId: session.id, code });
      const timeoutMs = typeof options?.timeoutMs === "number" ? options.timeoutMs : 120_000;
      const answer = await Promise.race([
        inbound.promise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Harness offer timed out waiting for answer code")), timeoutMs);
        })
      ]);
      if (typeof answer?.code !== "string") throw new Error("Harness answer code missing");
      yield answer.code;
    },
    async *accept(options) {
      if (!enabled) throw new Error("Harness peer pair is not enabled");
      const timeoutMs = typeof options?.timeoutMs === "number" ? options.timeoutMs : 120_000;
      const offer = await Promise.race([
        inbound.promise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Harness listen timed out waiting for offer code")), timeoutMs);
        })
      ]);
      if (typeof offer?.code !== "string") throw new Error("Harness offer code missing");
      const sessionId = typeof offer.sessionId === "string" ? offer.sessionId : `harness-${Date.now().toString(36)}`;
      yield { session: { id: sessionId, kind: "manual" }, code: offer.code };
    },
    async answer(session, code) {
      if (!enabled) throw new Error("Harness peer pair is not enabled");
      outbound?.resolve({ sessionId: session.id, code });
    },
    async cancel() {
      outbound?.reject(new Error("Harness peer pair cancelled"));
      inbound?.reject(new Error("Harness peer pair cancelled"));
      resetExchange();
    }
  };

  return {
    enable() {
      enabled = true;
      result = null;
      error = null;
      inflight = null;
      resetExchange();
    },
    disable() {
      enabled = false;
    },
    get enabled() {
      return enabled;
    },
    channel,
    async takeOutboundCode(timeoutMs = 60_000) {
      if (outbound === null) resetExchange();
      return Promise.race([
        outbound.promise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("No outbound peer-pair code")), timeoutMs);
        })
      ]);
    },
    giveInboundCode(code, sessionId) {
      if (inbound === null) resetExchange();
      inbound.resolve({ code, sessionId });
    },
    start(run) {
      if (inflight !== null) throw new Error("Harness peer pair already in progress");
      result = null;
      error = null;
      resetExchange();
      inflight = Promise.resolve()
        .then(run)
        .then((value) => {
          result = value;
          return value;
        })
        .catch((err) => {
          error = err instanceof Error ? err : new Error(String(err));
          return undefined;
        });
      return { started: true };
    },
    async wait(timeoutMs = 120_000) {
      if (result !== null) return result;
      if (error !== null) throw error;
      if (inflight === null) throw new Error("Harness peer pair was not started");
      await Promise.race([
        inflight,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Harness peer pair wait timed out")), timeoutMs);
        })
      ]);
      if (error !== null) throw error;
      if (result === null) throw new Error("Harness peer pair finished without a handle");
      return result;
    }
  };
}
