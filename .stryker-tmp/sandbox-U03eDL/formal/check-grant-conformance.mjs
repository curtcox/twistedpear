// @ts-nocheck
import { checkMachineConformance } from "./check-machine-conformance.mjs";
const result = await checkMachineConformance("grant");
console.log(`grant TLA+ relation conforms across ${result.edges} legal edges`);
