export class SansIOViolation extends Error {
  readonly api: string;

  constructor(api: string, message?: string) {
    super(message ?? `Sans-IO violation: protocol code must not call ${api}`);
    this.name = "SansIOViolation";
    this.api = api;
  }
}

type AnyFn = (...args: never[]) => unknown;

interface TripwireState {
  readonly originals: Map<string, unknown>;
}

const TRIPWIRE_KEY = "__twistedpear_sansio_tripwire__";

function thrower(api: string): AnyFn {
  return () => {
    throw new SansIOViolation(api);
  };
}

function defineGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    enumerable: true,
    value
  });
}

function getState(): TripwireState | undefined {
  return (globalThis as Record<string, unknown>)[TRIPWIRE_KEY] as TripwireState | undefined;
}

/**
 * Replace deny-listed globals with throwers before importing protocol modules.
 * Catches dynamic access that static analysis misses.
 */
export function installTripwire(): void {
  if (getState() !== undefined) {
    return;
  }

  const originals = new Map<string, unknown>();
  const g = globalThis as Record<string, unknown>;

  const save = (key: string): void => {
    originals.set(key, g[key]);
  };

  save("Date");
  save("setTimeout");
  save("setInterval");
  save("setImmediate");
  save("clearTimeout");
  save("clearInterval");
  save("queueMicrotask");
  save("fetch");
  save("performance");

  const OriginalDate = Date;
  const PatchedDate = function PatchedDate(...args: unknown[]) {
    if (args.length === 0) {
      throw new SansIOViolation("new Date()", "new Date() without arguments reads wall clock");
    }
    return new (OriginalDate as unknown as new (...a: unknown[]) => Date)(...args);
  } as unknown as DateConstructor;

  PatchedDate.now = () => {
    throw new SansIOViolation("Date.now");
  };
  PatchedDate.parse = OriginalDate.parse.bind(OriginalDate);
  PatchedDate.UTC = OriginalDate.UTC.bind(OriginalDate);
  Object.setPrototypeOf(PatchedDate, OriginalDate);
  Object.defineProperty(PatchedDate, "prototype", {
    value: OriginalDate.prototype,
    writable: false,
    configurable: false
  });
  Object.defineProperty(PatchedDate, "name", { value: "Date" });

  defineGlobal("Date", PatchedDate);

  const math = Math as unknown as Record<string, unknown>;
  originals.set("Math.random", math.random);
  math.random = thrower("Math.random");

  defineGlobal("setTimeout", thrower("setTimeout"));
  defineGlobal("setInterval", thrower("setInterval"));
  if ("setImmediate" in globalThis) {
    defineGlobal("setImmediate", thrower("setImmediate"));
  }
  defineGlobal("clearTimeout", thrower("clearTimeout"));
  defineGlobal("clearInterval", thrower("clearInterval"));
  defineGlobal("queueMicrotask", thrower("queueMicrotask"));

  if ("fetch" in globalThis) {
    defineGlobal("fetch", thrower("fetch"));
  }

  const perf = g["performance"] as Record<string, unknown> | undefined;
  if (perf !== undefined && typeof perf["now"] === "function") {
    originals.set("performance.now", perf["now"]);
    perf["now"] = thrower("performance.now");
  }

  const c = g["crypto"] as Record<string, unknown> | undefined;
  if (c !== undefined) {
    if (typeof c["getRandomValues"] === "function") {
      originals.set("crypto.getRandomValues", c["getRandomValues"]);
      c["getRandomValues"] = thrower("crypto.getRandomValues");
    }
    if (typeof c["randomUUID"] === "function") {
      originals.set("crypto.randomUUID", c["randomUUID"]);
      c["randomUUID"] = thrower("crypto.randomUUID");
    }
  }

  (globalThis as Record<string, unknown>)[TRIPWIRE_KEY] = { originals } satisfies TripwireState;
}

export function uninstallTripwire(): void {
  const state = getState();
  if (state === undefined) {
    return;
  }

  const g = globalThis as Record<string, unknown>;
  for (const [key, value] of state.originals) {
    if (key === "Math.random") {
      (Math as unknown as Record<string, unknown>).random = value;
      continue;
    }
    if (key === "performance.now") {
      const perf = g["performance"] as Record<string, unknown> | undefined;
      if (perf !== undefined) {
        perf["now"] = value;
      }
      continue;
    }
    if (key === "crypto.getRandomValues" || key === "crypto.randomUUID") {
      const c = g["crypto"] as Record<string, unknown> | undefined;
      if (c !== undefined) {
        c[key === "crypto.getRandomValues" ? "getRandomValues" : "randomUUID"] = value;
      }
      continue;
    }
    defineGlobal(key, value);
  }

  delete g[TRIPWIRE_KEY];
}

export function isTripwireInstalled(): boolean {
  return getState() !== undefined;
}
