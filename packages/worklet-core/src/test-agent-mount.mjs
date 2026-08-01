/**
 * Mounts the test-only peer control agent inside a worklet host.
 *
 * Shared by the desktop and mobile worklets so the iOS simulator, the Android
 * emulator, the Electron host, and `tp node` all expose exactly the same
 * control surface to `conformance/local-multipeer`. Activated only by an
 * explicit `connect-test-agent` message — never on a default code path.
 */
import { mountTestAgent } from "../../host-core/dist/test-agent.js";

/**
 * @param {{
 *   reticulum: unknown,
 *   provider: unknown,
 *   identity: unknown,
 *   label: string,
 *   platform: string,
 *   host: string,
 *   port: number,
 *   log?: (line: string) => void
 *   handleCommand?: (request: Record<string, unknown>) => Promise<Record<string, unknown>>
 *   receiveSessionInvite?: (invite: Record<string, unknown>) => Promise<void>
 * }} options
 */
export function connectTestAgent(options) {
  return mountTestAgent({
    reticulum: options.reticulum,
    provider: options.provider,
    identity: options.identity,
    label: options.label,
    platform: options.platform,
    controlHost: options.host,
    controlPort: options.port,
    ...(options.handleCommand === undefined ? {} : { handleCommand: options.handleCommand }),
    // A host with a mini-app runtime routes the verified invite into its own
    // chrome; the agent only records that it did.
    ...(options.receiveSessionInvite === undefined ? {} : { receiveSessionInvite: options.receiveSessionInvite }),
    ...(options.log === undefined ? {} : { log: options.log })
  });
}
