/**
 * Phase W4: capture Chromium's beforeinstallprompt and surface an in-app Install CTA.
 */
// @ts-nocheck


export type PwaInstallOutcome = "accepted" | "dismissed";

export interface BeforeInstallPromptLike extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: PwaInstallOutcome }>;
}

export type PwaInstallAvailability = "deferred" | "installed" | "unavailable";

export interface PwaInstallController {
  readonly getAvailability: () => PwaInstallAvailability;
  readonly subscribe: (listener: (availability: PwaInstallAvailability) => void) => () => void;
  readonly promptInstall: () => Promise<PwaInstallOutcome | null>;
  readonly dispose: () => void;
}

function isBeforeInstallPromptLike(event: Event): event is BeforeInstallPromptLike {
  const candidate = event as Partial<BeforeInstallPromptLike>;
  return typeof candidate.prompt === "function" && candidate.userChoice !== undefined;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export function createPwaInstallController(
  target: EventTarget = typeof window !== "undefined" ? window : new EventTarget()
): PwaInstallController {
  let deferred: BeforeInstallPromptLike | null = null;
  let availability: PwaInstallAvailability = isStandaloneDisplay() ? "installed" : "unavailable";
  const listeners = new Set<(availability: PwaInstallAvailability) => void>();

  const setAvailability = (next: PwaInstallAvailability) => {
    if (next === availability) {
      return;
    }

    availability = next;
    for (const listener of listeners) {
      listener(availability);
    }
  };

  const onBeforeInstallPrompt = (event: Event) => {
    if (!isBeforeInstallPromptLike(event)) {
      return;
    }

    event.preventDefault();
    deferred = event;
    setAvailability("deferred");
  };

  const onAppInstalled = () => {
    deferred = null;
    setAvailability("installed");
  };

  target.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  target.addEventListener("appinstalled", onAppInstalled);

  return {
    getAvailability: () => availability,
    subscribe(listener) {
      listeners.add(listener);
      listener(availability);
      return () => {
        listeners.delete(listener);
      };
    },
    async promptInstall() {
      if (deferred === null) {
        return null;
      }

      const promptEvent = deferred;
      deferred = null;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setAvailability(choice.outcome === "accepted" ? "installed" : "unavailable");
      return choice.outcome;
    },
    dispose() {
      target.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      target.removeEventListener("appinstalled", onAppInstalled);
      listeners.clear();
      deferred = null;
    }
  };
}
