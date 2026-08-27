// The host broker accepts 128 messages per app in a one-second window. Leave
// room for the KV reads around seeding and for unrelated startup calls instead
// of making the generated seed count an accidental startup limit.
export const SEED_BROKER_BATCH_SIZE = 96;
export const SEED_BROKER_PAUSE_MS = 1_100;

export async function writeSeedsWithinBrokerBudget(seeds, write, pause) {
  for (let index = 0; index < seeds.length; index += 1) {
    if (index > 0 && index % SEED_BROKER_BATCH_SIZE === 0) {
      await pause(SEED_BROKER_PAUSE_MS);
    }
    const seed = seeds[index];
    await write(seed.path, seed.content);
  }
}
