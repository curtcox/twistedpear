import type { PeerHandle } from "@twistedpear/peer-discovery";

export interface SessionInvite {
  readonly id: string;
  readonly appId: string;
  readonly peer: PeerHandle;
  readonly verifiedPeerLabel: string;
  readonly requestedClasses: ReadonlyArray<
    "camera" | "microphone" | "screen-capture"
  >;
  readonly receivedAt: number;
  readonly expiresAt: number;
  readonly phase: "pending" | "accepted" | "declined" | "expired";
}

export interface SessionInviteChrome {
  notify(invite: SessionInvite): Promise<void>;
  launchForeground(appId: string, inviteId: string): Promise<void>;
}

export class SessionInviteService {
  private readonly invites = new Map<string, SessionInvite>();
  constructor(
    private readonly chrome: SessionInviteChrome,
    private readonly now: () => number = () => 0,
  ) {}

  /** Called by the host LXMF delivery path; no mini-app code executes here. */
  async receive(
    input: Omit<SessionInvite, "receivedAt" | "phase"> & {
      readonly verified: boolean;
    },
  ): Promise<void> {
    if (!input.verified)
      throw new Error("Session invite peer must be verified");
    if (
      input.id.length < 1 ||
      input.id.length > 256 ||
      input.appId.length < 1 ||
      input.appId.length > 256
    ) {
      throw new Error("Session invite identity is invalid");
    }
    if (this.invites.has(input.id))
      throw new Error("Session invite replay was rejected");
    if (
      input.verifiedPeerLabel.length < 1 ||
      input.verifiedPeerLabel.length > 160
    ) {
      throw new Error("Session invite peer label is invalid");
    }
    if (input.expiresAt <= this.now())
      throw new Error("Session invite is unavailable");
    if (
      input.requestedClasses.length < 1 ||
      input.requestedClasses.length > 3
    ) {
      throw new Error("Session invite media request is invalid");
    }
    if (
      new Set(input.requestedClasses).size !== input.requestedClasses.length
    ) {
      throw new Error("Session invite media request is invalid");
    }
    const invite: SessionInvite = {
      ...input,
      receivedAt: this.now(),
      phase: "pending",
    };
    this.invites.set(invite.id, invite);
    await this.chrome.notify(invite);
  }

  async accept(id: string): Promise<void> {
    const invite = this.pending(id);
    this.invites.set(id, { ...invite, phase: "accepted" });
    // Foreground launch happens only after trusted chrome accepts.
    await this.chrome.launchForeground(invite.appId, invite.id);
  }

  decline(id: string): void {
    const invite = this.pending(id);
    this.invites.set(id, { ...invite, phase: "declined" });
  }

  list(): ReadonlyArray<SessionInvite> {
    const at = this.now();
    for (const [id, invite] of this.invites) {
      if (invite.phase === "pending" && at >= invite.expiresAt)
        this.invites.set(id, { ...invite, phase: "expired" });
    }
    return [...this.invites.values()];
  }

  private pending(id: string): SessionInvite {
    const invite = this.invites.get(id);
    if (
      invite === undefined ||
      invite.phase !== "pending" ||
      this.now() >= invite.expiresAt
    ) {
      throw new Error("Session invite is unavailable");
    }
    return invite;
  }
}
