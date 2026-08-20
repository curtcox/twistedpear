import { minify as terserMinify } from "terser";

/** Elm 0.19.1 runtime helpers that are safe to drop when unused. */
export const ELM_PURE_FUNCS = [
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
  "A7",
  "A8",
  "A9",
];

export async function minifyGuida(source: string): Promise<string> {
  const result = await terserMinify(source, {
    compress: {
      pure_funcs: ELM_PURE_FUNCS,
      pure_getters: true,
      keep_fargs: false,
      unsafe_comps: true,
      unsafe: true,
    },
    mangle: true,
    format: { comments: false },
  });
  if (result.code === undefined) {
    throw new Error("terser produced no output for Guida bundle");
  }
  return result.code;
}
