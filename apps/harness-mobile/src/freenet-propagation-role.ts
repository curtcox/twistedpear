/**
 * Status helpers for the mobile Freenet-backed LXMF propagation role.
 * The worklet starts PropagationServer with FreenetPropagationStore as
 * remoteMirror when the remote-node grant enables the propagation capability.
 */

export interface FreenetPropagationRoleStatus {
  readonly freenetPropagation?: boolean;
  readonly freenetPropagationAttached?: boolean;
  readonly freenetPropagationRole?: boolean;
  readonly propagationEnabled?: boolean;
  readonly propagationStoreBytes?: number;
  readonly propagationMessageCount?: number;
}

/** True when the grant asked for propagation and the worklet role is running. */
export function freenetPropagationRoleOnline(
  status: FreenetPropagationRoleStatus
): boolean {
  return (
    status.freenetPropagation === true &&
    status.freenetPropagationAttached === true &&
    status.freenetPropagationRole === true &&
    status.propagationEnabled === true
  );
}

export function freenetPropagationRoleLabel(
  status: FreenetPropagationRoleStatus
): string {
  if (freenetPropagationRoleOnline(status)) {
    const messages = status.propagationMessageCount ?? 0;
    const bytes = status.propagationStoreBytes ?? 0;
    return `Propagation role online · ${messages} msg · ${bytes} B`;
  }
  if (status.freenetPropagation === true) {
    return "Propagation grant enabled · role not running";
  }
  return "Propagation role off";
}
