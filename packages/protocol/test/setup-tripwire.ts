import { afterAll, beforeAll } from "vitest";
import {
  installTripwire,
  uninstallTripwire,
} from "@twistedpear/effects/tripwire";

beforeAll(() => {
  installTripwire();
});

afterAll(() => {
  uninstallTripwire();
});
