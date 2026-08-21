import type {
  ConfirmationRequest,
  ConfirmationResult,
  HostConfirmationChannel,
} from "../../../packages/miniapp-runtime/src/confirm.ts";

export type PendingConfirmation = {
  readonly request: ConfirmationRequest;
  readonly resolve: (result: ConfirmationResult) => void;
};

export type ConfirmationController = {
  readonly channel: HostConfirmationChannel;
  readonly subscribe: (listener: (pending: PendingConfirmation | null) => void) => () => void;
  readonly respond: (approved: boolean) => void;
};

const KIND_TITLES: Record<string, string> = {
  package: "Package and sign an app?",
  publish: "Publish an app to other users?",
  install: "Install an app?",
  preview: "Run a preview of this app?",
  "trust-import": "Trust a new publisher?",
};

export function confirmationTitle(request: ConfirmationRequest): string {
  if (request.summary.operation === "compile") {
    return "Compile this Guida project?";
  }
  return KIND_TITLES[request.kind] ?? `Confirm ${request.kind}?`;
}

export function createConfirmationController(): ConfirmationController {
  let pending: PendingConfirmation | null = null;
  const listeners = new Set<(next: PendingConfirmation | null) => void>();

  function emit() {
    for (const listener of listeners) listener(pending);
  }

  return {
    channel: {
      confirm: (request) =>
        new Promise((resolve) => {
          pending = { request, resolve };
          emit();
        }),
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(pending);
      return () => {
        listeners.delete(listener);
      };
    },
    respond(approved) {
      if (pending === null) return;
      const current = pending;
      pending = null;
      emit();
      current.resolve({ approved });
    },
  };
}

export const autoApproveChannel: HostConfirmationChannel = {
  confirm: async () => ({ approved: true }),
};
