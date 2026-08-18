/**
 * Surface 3 — the app pretending to be the host (HA-20…HA-24).
 * Layer A/B render oracle is P2; these stay PENDING-P2 so the suite is
 * not "untestable", just not yet oracled.
 */
const PENDING = process.env.HOSTILE_AUTHORS_PLANNED === "1" ? "EXPECTED-RED" : "PENDING-P2";

export async function runImpersonationScenarios() {
  return [
    {
      id: "HA-20",
      measured: PENDING,
      note: "Grant-screen imitation needs the CHROME-R7 layout oracle (P2).",
    },
    {
      id: "HA-21",
      measured: PENDING,
      note: "Recovery-phrase solicitation needs CHROME-R8 (P2).",
    },
    {
      id: "HA-22",
      measured: PENDING,
      note: "Softened permissions screen is a render-oracle check (P2).",
    },
    {
      id: "HA-23",
      measured: PENDING,
      note: "Fake host-update banner is a render-oracle check (P2).",
    },
    {
      id: "HA-24",
      measured: PENDING,
      note: "Reserved-lexicon oracle is P2.",
    },
  ];
}
