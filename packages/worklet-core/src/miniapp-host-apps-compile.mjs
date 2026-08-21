/**
 * Dev-loop apps-backend factories. `loadWorklet` is required so a browser host
 * can inject a worker client without this module ever importing the compiler.
 */

export function createAppsBackendCompileAction({
  collectWorkspaceFiles,
  writeWorkspaceFile,
  loadWorklet,
}) {
  return async function compileApp(appId, { projectPrefix }) {
    const files = await collectWorkspaceFiles(appId, projectPrefix);
    if (!files.some((file) => file.path === "elm.json")) {
      return { compiled: false, reason: "not a Guida project" };
    }
    const worklet = await loadWorklet();
    if (worklet === null) {
      return {
        compiled: false,
        reason: "Guida compiler is not available on this host",
      };
    }
    const snapshot = files.map((file) => ({
      path: file.path,
      content: file.content,
    }));
    try {
      const result = await worklet.compileGuidaWorkspace(snapshot);
      await writeWorkspaceFile(
        appId,
        `${projectPrefix}/bundle.js`,
        result.bundle,
      );
      return {
        compiled: true,
        bytes: result.minifiedBytes,
        compiler: result.compilerVersion,
      };
    } catch (error) {
      const problems = await worklet
        .diagnoseGuidaWorkspace(snapshot, "src/Main.elm")
        .catch(() => []);
      return {
        compiled: false,
        reason: error instanceof Error ? error.message : String(error),
        problems,
      };
    }
  };
}

export function createAppsBackendFormatAction({ loadWorklet }) {
  return async function formatApp(_appId, { content }) {
    const worklet = await loadWorklet();
    if (worklet === null) {
      throw new Error("Guida compiler is not available on this host");
    }
    const formatted = await worklet.formatGuidaSource(content);
    return { formatted };
  };
}

export function createAppsBackendDiagnosticsAction({
  collectWorkspaceFiles,
  loadWorklet,
}) {
  return async function diagnoseApp(appId, { projectPrefix, path }) {
    const files = await collectWorkspaceFiles(appId, projectPrefix);
    if (!files.some((file) => file.path === "elm.json")) {
      return { problems: [] };
    }
    const worklet = await loadWorklet();
    if (worklet === null) {
      throw new Error("Guida compiler is not available on this host");
    }
    const snapshot = files.map((file) => ({
      path: file.path,
      content: file.content,
    }));
    const problems = await worklet.diagnoseGuidaWorkspace(
      snapshot,
      path ?? "src/Main.elm",
    );
    return { problems };
  };
}

export function createAppsBackendPreviewAction({
  collectWorkspaceFiles,
  stopPreviewHost,
  createPreviewHost,
  previewRef,
  pushPreviewRuntime,
  now,
  grantTtlMs,
}) {
  return async function previewApp(appId, { projectPrefix, manifest, grants }) {
    const files = await collectWorkspaceFiles(appId, projectPrefix);
    const entryFile = files.find((file) => file.path === manifest.entry);
    if (entryFile === undefined) {
      throw new Error(
        `Entry file "${manifest.entry}" not found under ${projectPrefix}/`,
      );
    }

    await stopPreviewHost();
    const previewHost = createPreviewHost();
    const publisherKey = `dev-preview:${appId}`;
    await previewHost.grantStore.set({
      appId: manifest.name,
      publisherPublicKey: publisherKey,
      declared: manifest.capabilities,
      requestedGrants: grants,
      now: now(),
      ttlMs: grantTtlMs(grants),
    });
    await previewHost.host.launch(
      {
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        capabilities: manifest.capabilities,
        publisherPublicKey: publisherKey,
      },
      entryFile.content,
    );
    previewRef.current = previewHost;
    pushPreviewRuntime();
    return { launched: true };
  };
}
