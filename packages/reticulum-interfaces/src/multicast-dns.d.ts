declare module "multicast-dns" {
  interface MdnsInstance {
    on(
      event: "response",
      listener: (response: {
        answers: Array<{ name: string; type: string; data: unknown }>;
      }) => void,
    ): void;
    on(event: "error", listener: (error: unknown) => void): void;
    query(packet: { questions: Array<{ name: string; type: string }> }): void;
    respond(packet: {
      answers: Array<{
        name: string;
        type: string;
        ttl: number;
        data: unknown;
      }>;
    }): void;
    destroy(): void;
  }

  export default function createMdns(
    options?: Record<string, unknown>,
  ): MdnsInstance;
}
