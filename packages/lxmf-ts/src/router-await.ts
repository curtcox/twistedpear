import {
  DELIVERY_RECEIPT_POLL_DEFAULT_TIMEOUT_MS,
  DELIVERY_RECEIPT_POLL_TIMER_ID,
  LINK_AWAIT_DEFAULT_TIMEOUT_MS,
  LINK_AWAIT_TIMER_ID,
  initialDeliveryReceiptPollState,
  initialLinkAwaitState,
  stepDeliveryReceiptPollWithActions,
  stepLinkAwaitWithActions,
  type ReceiptPollStatusValue
} from "@twistedpear/protocol";
import type { Link, PacketReceipt, RegisteredDestination, Reticulum } from "@twistedpear/reticulum-ts";

/** Await an outbound link with the Sans-IO link-await machine. */
export function awaitOutboundLink(
  reticulum: Reticulum,
  outbound: RegisteredDestination,
  options: {
    readonly timeoutMs?: number;
    readonly timeoutError: string;
    readonly onTimeout?: () => void;
  }
): Promise<Link> {
  const timeoutMs = options.timeoutMs ?? LINK_AWAIT_DEFAULT_TIMEOUT_MS;
  return new Promise<Link>((resolve, reject) => {
    const armed = stepLinkAwaitWithActions(initialLinkAwaitState(), {
      kind: "link-await/arm",
      timeoutMs
    });
    let state = armed.state;
    let timer: { cancel(): void } | null = null;
    let concluded = false;
    let pendingLink: Link | null = null;

    const finish = (result: { ok: true; link: Link } | { ok: false }): void => {
      if (concluded) {
        return;
      }
      concluded = true;
      pendingLink = null;
      if (result.ok) {
        resolve(result.link);
        return;
      }
      options.onTimeout?.();
      reject(new Error(options.timeoutError));
    };

    const applyIntents = (
      intents: ReturnType<typeof stepLinkAwaitWithActions>["intents"]
    ): void => {
      for (const intent of intents) {
        if (intent.kind === "timer/set" && intent.timer.id === LINK_AWAIT_TIMER_ID) {
          timer?.cancel();
          timer = reticulum.runtime.clock.setTimeout(() => {
            timer = null;
            const tick = stepLinkAwaitWithActions(state, {
              kind: "timer/fired",
              id: LINK_AWAIT_TIMER_ID,
              at: reticulum.runtime.clock.now()
            });
            state = tick.state;
            applyIntents(tick.intents);
            applyActions(tick.actions);
          }, intent.timer.delayMs);
        }
        if (intent.kind === "timer/cancel" && intent.timer.id === LINK_AWAIT_TIMER_ID) {
          timer?.cancel();
          timer = null;
        }
      }
    };

    const applyActions = (
      actions: ReturnType<typeof stepLinkAwaitWithActions>["actions"]
    ): void => {
      for (const action of actions) {
        if (action.kind === "request-link") {
          outbound.requestLink({
            linkEstablished(establishLink) {
              pendingLink = establishLink;
              const result = stepLinkAwaitWithActions(state, {
                kind: "link-await/established"
              });
              state = result.state;
              applyIntents(result.intents);
              applyActions(result.actions);
            }
          });
        }
        if (action.kind === "resolve") {
          const link = pendingLink;
          if (link !== null) {
            finish({ ok: true, link });
          }
        }
        if (action.kind === "reject") {
          finish({ ok: false });
        }
      }
    };

    applyIntents(armed.intents);
    applyActions(armed.actions);
  });
}

/** Poll a packet receipt until it settles or times out. */
export function pollDeliveryReceipt(
  reticulum: Reticulum,
  receipt: PacketReceipt,
  timeoutMs = DELIVERY_RECEIPT_POLL_DEFAULT_TIMEOUT_MS
): Promise<ReceiptPollStatusValue> {
  return new Promise<ReceiptPollStatusValue>((resolve) => {
    const armed = stepDeliveryReceiptPollWithActions(initialDeliveryReceiptPollState(), {
      kind: "poll/arm",
      at: reticulum.runtime.clock.now(),
      timeoutMs
    });
    let state = armed.state;
    let timer: { cancel(): void } | null = null;
    let concluded = false;

    const finish = (status: ReceiptPollStatusValue): void => {
      if (concluded) {
        return;
      }
      concluded = true;
      timer?.cancel();
      timer = null;
      resolve(status);
    };

    const applyIntents = (
      intents: ReturnType<typeof stepDeliveryReceiptPollWithActions>["intents"]
    ): void => {
      for (const intent of intents) {
        if (intent.kind === "timer/cancel" && intent.timer.id === DELIVERY_RECEIPT_POLL_TIMER_ID) {
          timer?.cancel();
          timer = null;
        }
        if (intent.kind === "timer/set" && intent.timer.id === DELIVERY_RECEIPT_POLL_TIMER_ID) {
          timer?.cancel();
          timer = reticulum.runtime.clock.setTimeout(() => {
            timer = null;
            const tick = stepDeliveryReceiptPollWithActions(state, {
              kind: "timer/fired",
              id: DELIVERY_RECEIPT_POLL_TIMER_ID,
              at: reticulum.runtime.clock.now()
            });
            state = tick.state;
            applyIntents(tick.intents);
            applyActions(tick.actions);
          }, intent.timer.delayMs);
        }
      }
    };

    const applyActions = (
      actions: ReturnType<typeof stepDeliveryReceiptPollWithActions>["actions"]
    ): void => {
      for (const action of actions) {
        if (action.kind === "probe") {
          const probe = stepDeliveryReceiptPollWithActions(state, {
            kind: "poll/receipt-status",
            status: receipt.status as ReceiptPollStatusValue,
            at: reticulum.runtime.clock.now()
          });
          state = probe.state;
          applyIntents(probe.intents);
          applyActions(probe.actions);
        }
        if (action.kind === "resolve") {
          finish(action.status);
        }
      }
    };

    applyIntents(armed.intents);
    applyActions(armed.actions);
  });
}
