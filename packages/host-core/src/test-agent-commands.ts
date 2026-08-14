import {
  encodeLinkControl,
  encodeReadinessEnvelope,
  encodeSessionInviteEnvelope,
  READINESS_REQUEST_ID,
} from "@twistedpear/protocol";
import {
  sessionInviteContent,
  SESSION_INVITE_TITLE,
} from "./session-invite-carrier.js";
import { handleObserveCommand } from "./observe-agent.js";
import { announceBurst } from "./announce-burst.js";
import type { TestAgentOptions } from "./test-agent.js";
import {
  CALL_PREFIX,
  LINK_PROBE_MAX_BUDGET_BYTES,
  PROBE_PREFIX,
  REALTIME_PREFIX,
  SESSION_INVITE_TTL_MS,
  TestAgentRuntime,
  type ControlRequest,
} from "./test-agent-runtime.js";

type CommandHandler = (
  request: ControlRequest,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export class TestAgentCommands extends TestAgentRuntime {
  static async start(options: TestAgentOptions): Promise<TestAgentCommands> {
    const runtime = new TestAgentCommands(options);
    await runtime.init();
    return runtime;
  }

  protected override async dispatchCommand(
    request: ControlRequest,
  ): Promise<Record<string, unknown>> {
    // hasOwn, not a bare lookup: `constructor` and friends are not commands.
    const commands = this.commands();
    const command = Object.hasOwn(commands, request.cmd)
      ? commands[request.cmd]
      : undefined;
    if (command !== undefined) return command(request);
    return super.dispatchCommand(request);
  }

  private observe(request: ControlRequest): Record<string, unknown> {
    const result = handleObserveCommand(this.observeState, request);
    if (result === null) {
      throw new Error(`Unknown test-agent command: ${request.cmd}`);
    }
    return result;
  }

  private async sendProbeCommand(
    request: ControlRequest,
  ): Promise<Record<string, unknown>> {
    if (request.toLxmfAddress === undefined || request.nonce === undefined) {
      throw new Error("send requires toLxmfAddress and nonce");
    }
    await this.sendProbe(
      request.toLxmfAddress,
      `${PROBE_PREFIX}${request.nonce}`,
    );
    return {};
  }

  private async sendRealtimeCommand(
    request: ControlRequest,
  ): Promise<Record<string, unknown>> {
    if (
      request.toLxmfAddress === undefined ||
      request.nonce === undefined ||
      request.payloadHex === undefined
    ) {
      throw new Error(
        "send-realtime requires toLxmfAddress, nonce, and payloadHex",
      );
    }
    await this.sendRealtime(
      request.toLxmfAddress,
      REALTIME_PREFIX,
      request.nonce,
      request.payloadHex,
    );
    return {};
  }

  private async sendInvite(
    request: ControlRequest,
  ): Promise<Record<string, unknown>> {
    if (request.toLxmfAddress === undefined)
      throw new Error("send-invite requires toLxmfAddress");
    const appId =
      typeof request.appId === "string" ? request.appId : "line-check";
    const requestedClasses = Array.isArray(request.requestedClasses)
      ? (request.requestedClasses as ReadonlyArray<
          "camera" | "microphone" | "screen-capture"
        >)
      : (["microphone"] as const);
    const id = `invite-${this.options.label}-${this.nextInvite++}`;
    const expiresAt = Date.now() + SESSION_INVITE_TTL_MS;
    const envelope = encodeSessionInviteEnvelope({
      id,
      appId,
      requestedClasses,
      expiresAt,
    });
    await this.sendMessage(
      request.toLxmfAddress,
      SESSION_INVITE_TITLE,
      sessionInviteContent(envelope),
    );
    this.inviteEntries.push({
      kind: "sent",
      id,
      appId,
      peerLabel: request.toLxmfAddress.slice(0, 12),
      requestedClasses,
      expiresAt,
      at: Date.now(),
      peerDestinationHash: request.toLxmfAddress,
    });
    return { inviteId: id, appId, expiresAt, bytes: envelope.length };
  }

  private async acceptInvite(
    request: ControlRequest,
  ): Promise<Record<string, unknown>> {
    const inviteId =
      typeof request.inviteId === "string" ? request.inviteId : undefined;
    if (inviteId === undefined)
      throw new Error("accept-invite requires inviteId");
    const raised = this.inviteEntries.findLast(
      (entry) => entry.kind === "raised" && entry.id === inviteId,
    );
    if (raised === undefined) throw new Error(`No raised invite ${inviteId}`);
    const knownPeerHash = (): string | undefined =>
      raised.peerDestinationHash ?? this.peerDestinationHashForInvite(inviteId);
    if (
      this.inviteEntries.some(
        (entry) => entry.kind === "accepted" && entry.id === inviteId,
      )
    ) {
      return {
        accepted: true,
        inviteId,
        peerDestinationHash: knownPeerHash() ?? null,
      };
    }
    await this.options.acceptSessionInvite?.(inviteId);
    const peerDestinationHash = knownPeerHash();
    this.inviteEntries.push({
      ...raised,
      kind: "accepted",
      at: Date.now(),
      ...(peerDestinationHash === undefined ? {} : { peerDestinationHash }),
    });
    return {
      accepted: true,
      inviteId,
      peerDestinationHash: peerDestinationHash ?? null,
    };
  }

  private async sendCallCommand(
    request: ControlRequest,
  ): Promise<Record<string, unknown>> {
    const inviteId =
      typeof request.inviteId === "string" ? request.inviteId : undefined;
    if (
      inviteId === undefined ||
      request.nonce === undefined ||
      request.payloadHex === undefined
    ) {
      throw new Error("send-call requires inviteId, nonce, and payloadHex");
    }
    const accepted = this.inviteEntries.findLast(
      (entry) => entry.kind === "accepted" && entry.id === inviteId,
    );
    if (accepted === undefined)
      throw new Error(`Invite ${inviteId} has not been accepted`);
    const peerDestinationHash =
      accepted.peerDestinationHash ??
      this.peerDestinationHashForInvite(inviteId);
    if (peerDestinationHash === undefined)
      throw new Error(`No peer destination for accepted invite ${inviteId}`);
    await this.sendCall(
      peerDestinationHash,
      CALL_PREFIX,
      request.nonce,
      request.payloadHex,
    );
    return {
      sent: true,
      inviteId,
      peerDestinationHash,
      bytes: Math.floor(request.payloadHex.length / 2),
    };
  }

  private async requestReadiness(
    request: ControlRequest,
  ): Promise<Record<string, unknown>> {
    if (request.toLxmfAddress === undefined)
      throw new Error("request-readiness requires toLxmfAddress");
    await this.sendLinkControl(
      request.toLxmfAddress,
      READINESS_REQUEST_ID,
      encodeReadinessEnvelope(READINESS_REQUEST_ID, this.localReadiness()),
    );
    return {};
  }

  private async linkProbe(
    request: ControlRequest,
  ): Promise<Record<string, unknown>> {
    if (request.toLxmfAddress === undefined)
      throw new Error("link-probe requires toLxmfAddress");
    const budgetBytes =
      typeof request.budgetBytes === "number"
        ? request.budgetBytes
        : LINK_PROBE_MAX_BUDGET_BYTES;
    if (
      !Number.isInteger(budgetBytes) ||
      budgetBytes < 256 ||
      budgetBytes > LINK_PROBE_MAX_BUDGET_BYTES
    ) {
      throw new Error(
        `link-probe budget must be 256-${LINK_PROBE_MAX_BUDGET_BYTES} bytes`,
      );
    }
    const id = `probe-${this.options.label}-${this.nextProbe++}`;
    const envelope = encodeLinkControl({
      type: 2,
      id,
      payload: new Uint8Array(Math.max(0, budgetBytes - 8 - id.length)),
    });
    this.probeEntries.set(id, {
      id,
      toDestinationHash: request.toLxmfAddress,
      budgetBytes: envelope.length,
      sentAt: Date.now(),
      rttMs: null,
    });
    await this.sendLinkControl(request.toLxmfAddress, id, envelope);
    // `id` is the control frame's correlation key; never shadow it here.
    return { probeId: id, budgetBytes: envelope.length };
  }

  /**
   * The control vocabulary. A table rather than a switch so each command is a
   * named unit and an unknown one falls through to the host's own handler.
   */
  private commands(): Record<string, CommandHandler> {
    const { label, platform } = this.options;
    const { identityHash, lxmfAddress, delivery } = this.deliverySession;
    return {
      info: () => ({ label, platform, identityHash, lxmfAddress }),
      peers: () => ({ peers: this.deliverySession.peers() }),
      inbox: () => ({ inbox: [...this.inboxEntries] }),
      "realtime-inbox": () => ({ inbox: [...this.realtimeEntries] }),
      "call-inbox": () => ({ inbox: [...this.callEntries] }),
      status: () => ({ status: this.buildStatus() }),
      announce: async () => {
        await delivery.announce();
        return {};
      },
      "announce-burst": (request) =>
        announceBurst(
          () => delivery.announce(),
          typeof request.count === "number" ? request.count : 16,
        ),
      send: (request) => this.sendProbeCommand(request),
      "send-realtime": (request) => this.sendRealtimeCommand(request),
      "link-state": () => ({
        readiness: [...this.readinessEntries],
        probes: [...this.probeEntries.values()],
        dropCensus: this.dropCensus.snapshot(),
      }),
      subscribe: (request) => this.observe(request),
      unsubscribe: (request) => this.observe(request),
      "observe-snapshot": (request) => this.observe(request),
      "invite-state": () => ({ invites: [...this.inviteEntries] }),
      "send-invite": (request) => this.sendInvite(request),
      "accept-invite": (request) => this.acceptInvite(request),
      "send-call": (request) => this.sendCallCommand(request),
      "request-readiness": (request) => this.requestReadiness(request),
      "link-probe": (request) => this.linkProbe(request),
    };
  }
}
