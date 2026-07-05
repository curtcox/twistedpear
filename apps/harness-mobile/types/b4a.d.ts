declare module "b4a" {
  export function from(value: string, encoding?: string): Uint8Array;
  export function toString(value: Uint8Array, encoding?: string): string;
}
