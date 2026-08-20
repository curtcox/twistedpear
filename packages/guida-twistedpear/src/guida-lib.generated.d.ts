declare const guida: {
  make: (
    config: unknown,
    path: string,
    options?: { debug?: boolean; optimize?: boolean; sourcemaps?: boolean },
  ) => Promise<unknown>;
  format: (config: unknown, content: string) => Promise<unknown>;
  diagnostics: (config: unknown, args: unknown) => Promise<unknown>;
  install: (config: unknown, pkg: string) => Promise<unknown>;
  uninstall: (config: unknown, pkg: string) => Promise<unknown>;
};
export default guida;
