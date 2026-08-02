
export * from "./host/shared.js";
export type * from "./host/shared.js";
import { MiniappHostLayer2 } from "./host/layer-2.js";
export class MiniappHost extends MiniappHostLayer2 {
  protected now(): number {
    return this.options.now?.() ?? Date.now();
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
