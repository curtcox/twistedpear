import type {
  StreamOffer,
  StreamOfferBatch,
  StreamSink,
  InboundStream,
  InboundMediaBackend,
} from "./media-stream-types.js";

export class InboundMediaRouter {
  private readonly offers = new Map<
    string,
    { appId: string; offer: StreamOffer }
  >();
  private readonly streams = new Map<
    string,
    { appId: string; stream: InboundStream }
  >();
  constructor(
    private readonly backend: InboundMediaBackend,
    private readonly now: () => number = () => 0,
  ) {}
  async pollOffers(appId: string, cursor?: string): Promise<StreamOfferBatch> {
    const batch = await this.backend.pollOffers(appId, cursor);
    const offers = batch.offers.filter((offer) => offer.expiresAt > this.now());
    for (const offer of offers) this.offers.set(offer.id, { appId, offer });
    return { cursor: batch.cursor, offers };
  }
  async accept(
    appId: string,
    offerId: string,
    sink: StreamSink,
  ): Promise<InboundStream> {
    const entry = this.owned(appId, offerId);
    if (entry.offer.expiresAt <= this.now())
      throw new Error("Stream offer expired");
    if (entry.offer.classId === "microphone" && sink.kind !== "speaker") {
      throw new Error("Microphone streams require a speaker sink");
    }
    if (entry.offer.classId !== "microphone" && sink.kind !== "remote-video") {
      throw new Error("Video streams require a remote-video sink");
    }
    if (sink.kind === "remote-video" && sink.widgetId.length < 1)
      throw new Error("Remote-video widget id is required");
    const stream = await this.backend.accept(appId, entry.offer, sink);
    this.offers.delete(offerId);
    this.streams.set(stream.handle, { appId, stream });
    return stream;
  }
  async decline(
    appId: string,
    offerId: string,
    reason?: string,
  ): Promise<void> {
    const entry = this.owned(appId, offerId);
    await this.backend.decline(appId, entry.offer, reason?.slice(0, 160));
    this.offers.delete(offerId);
  }
  async closeApp(appId: string): Promise<void> {
    const closes: Array<Promise<void>> = [];
    for (const [handle, entry] of this.streams) {
      if (entry.appId !== appId) continue;
      this.streams.delete(handle);
      closes.push(this.backend.close(appId, entry.stream));
    }
    for (const [offerId, entry] of this.offers) {
      if (entry.appId === appId) this.offers.delete(offerId);
    }
    await Promise.allSettled(closes);
  }
  private owned(
    appId: string,
    offerId: string,
  ): { appId: string; offer: StreamOffer } {
    const entry = this.offers.get(offerId);
    if (entry === undefined || entry.appId !== appId)
      throw new Error("Unknown stream offer");
    return entry;
  }
}
