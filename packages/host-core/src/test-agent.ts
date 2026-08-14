/**
 * Peer control agent for the single-machine multi-peer environment and field
 * diagnosis. Formerly named "test agent"; it is the tool used to drive and
 * observe hosts (`tp node`, Electron, iOS/Android harness).
 *
 * Every host implementation can mount this agent to become observable and
 * drivable by `conformance/local-multipeer`. It never activates on a default
 * code path: a host must be handed an explicit control endpoint.
 *
 * The agent dials *out* to the harness control server rather than listening.
 * Outbound works identically from a Node process, a Bare worklet, the iOS
 * simulator, and the Android emulator (via 10.0.2.2), and needs no listening
 * socket or entitlement inside a sandboxed app. The socket comes from
 * `reticulum.runtime.tcp`, so the same code runs on every runtime.
 */

import { TestAgentCommands } from "./test-agent-commands.js";
import type { TestAgentOptions, TestAgentSession } from "./test-agent-types.js";

export {
  TEST_AGENT_CALL_TITLE,
  TEST_AGENT_LINK_TITLE,
  TEST_AGENT_PROBE_TITLE,
  TEST_AGENT_REALTIME_TITLE,
} from "./test-agent-runtime.js";

export type {
  TestAgentCallEntry,
  TestAgentInboxEntry,
  TestAgentInfo,
  TestAgentInviteEntry,
  TestAgentOptions,
  TestAgentPeerRecord,
  TestAgentProbeEntry,
  TestAgentReadinessEntry,
  TestAgentRealtimeEntry,
  TestAgentSession,
  TestAgentStatus,
} from "./test-agent-types.js";

/**
 * Mounts the agent and starts dialing the control server in the background.
 * Resolves once the LXMF delivery destination exists, so callers can read
 * `lxmfAddress` immediately without waiting for the harness to be up.
 */
export async function mountTestAgent(
  options: TestAgentOptions,
): Promise<TestAgentSession> {
  const runtime = await TestAgentCommands.start(options);
  return runtime.session();
}
