import type { NotifyPostRequest } from "../services/notify.js";
import { MiniappHostLayer1HandlersServices } from "./layer-1-handlers-services.js";

export abstract class MiniappHostLayer1HandlersFacilities extends MiniappHostLayer1HandlersServices {
  protected registerFacilitiesHandlers(): void {
    this.broker.register(
      "notify",
      "post",
      "notify:post",
      (request, context) => {
        const notification = this.notifyService.post(
          context.appId,
          context.publisherPublicKey,
          request.payload as NotifyPostRequest,
        );
        this.options.callbacks?.onNotification?.(notification);
        return notification;
      },
    );

    this.broker.register("crypto", "randomBytes", null, (request) =>
      this.cryptoService.randomBytes(
        (request.payload as { n?: unknown } | undefined)?.n,
      ),
    );
    this.broker.register("crypto", "hash", null, (request) => {
      const payload = request.payload as
        { alg?: unknown; bytes?: unknown } | undefined;
      return this.cryptoService.hash(payload?.alg, payload?.bytes);
    });
    this.broker.register("crypto", "hmac", null, (request) => {
      const payload = request.payload as
        { alg?: unknown; key?: unknown; bytes?: unknown } | undefined;
      return this.cryptoService.hmac(
        payload?.alg,
        payload?.key,
        payload?.bytes,
      );
    });
    this.broker.register("crypto", "timingSafeEqual", null, (request) => {
      const payload = request.payload as
        { a?: unknown; b?: unknown } | undefined;
      return this.cryptoService.timingSafeEqual(payload?.a, payload?.b);
    });
  }
}
