declare module "seek-bzip" {
  interface BunzipDecoder {
    decode(input: Uint8Array): Uint8Array;
  }

  const Bunzip: BunzipDecoder;
  export default Bunzip;
}
