// @ts-nocheck
import { readFile } from "node:fs/promises";

const models = [
  ["grant Tamarin", "symbolic/grant-boundary.spthy", ["grant_authenticity", "Issued", "Accepted"]],
  ["link Tamarin", "symbolic/link-handshake.spthy", ["session_key_secrecy", "initiator_authenticates_responder", "responder_authenticates_initiator"]],
  ["grant ProVerif", "symbolic/grant-boundary.pv", ["event(Accepted", "event(Issued", "attacker(host_key)"]],
  ["link ProVerif", "symbolic/link-handshake.pv", ["InitiatorEstablished", "ResponderEstablished", "equation forall"]]
];

for (const [name, path, required] of models) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  if (/\badmit\b|TODO|FIXME/.test(source)) throw new Error(`${name} contains an unfinished proof marker`);
  for (const token of required) if (!source.includes(token)) throw new Error(`${name} is missing ${token}`);
}
console.log(`symbolic model inventory is complete (${models.length} models)`);
