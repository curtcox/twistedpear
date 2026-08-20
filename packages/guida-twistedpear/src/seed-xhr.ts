import type { GuidaXhrLike } from "./fs-config.js";
import { utf8 } from "./fs-config.js";

const EMPTY_UPDATES = '{"elm":[],"guida":[]}';
const SEEDED_CATALOG =
  '{"elm":{"elm/core":["1.0.5"],"elm/json":["1.1.3"]},"guida":{}}';

/**
 * Offline XHR for Guida's package registry. Template compiles only need
 * elm/core and elm/json; those sources live in the memory home cache, and
 * this stub answers the metadata GETs Guida still issues.
 */
export function createPackageRegistryXhr(
  files: Map<string, Uint8Array>,
  home: string,
): new () => GuidaXhrLike {
  return class PackageRegistryXhr implements GuidaXhrLike {
    status = 0;
    response: ArrayBuffer | string | null = null;
    responseText = "";
    responseType = "";
    onload: (() => void) | null = null;
    onerror: ((err?: unknown) => void) | null = null;
    ontimeout: (() => void) | null = null;
    private method = "GET";
    private url = "";

    open(method: string, url: string): void {
      this.method = method;
      this.url = url;
    }

    setRequestHeader(_key: string, _value: string): void {}

    getAllResponseHeaders(): string {
      return "content-type: application/json";
    }

    send(_body?: unknown): void {
      queueMicrotask(() => this.respond());
    }

    private respond(): void {
      const url = this.url;
      if (/\/all-packages\/since\//u.test(url)) {
        this.ok(EMPTY_UPDATES);
        return;
      }
      if (/\/all-packages\/?$/u.test(url)) {
        this.ok(SEEDED_CATALOG);
        return;
      }
      const guidaJson = url.match(
        /\/packages\/([^/]+\/[^/]+\/[^/]+)\/guida\.json/u,
      );
      if (guidaJson) {
        this.ok(
          `This is a Elm package, use /packages/${guidaJson[1]}/elm.json endpoint instead.`,
        );
        return;
      }
      const elmJson = url.match(
        /\/packages\/([^/]+)\/([^/]+)\/([^/]+)\/elm\.json/u,
      );
      if (elmJson) {
        const [, author, name, version] = elmJson;
        const path = `${home}/.guida/1.0.0/packages/${author}/${name}/${version}/elm.json`;
        const body = files.get(path);
        if (body === undefined) {
          this.fail(new Error(`seeded elm.json missing: ${path}`));
          return;
        }
        this.ok(utf8(body));
        return;
      }
      this.fail(
        new Error(`offline Guida compile cannot fetch ${this.method} ${url}`),
      );
    }

    private ok(text: string): void {
      this.status = 200;
      this.responseText = text;
      this.response = text;
      this.onload?.();
    }

    private fail(error: Error): void {
      this.status = 0;
      this.onerror?.(error);
    }
  };
}
