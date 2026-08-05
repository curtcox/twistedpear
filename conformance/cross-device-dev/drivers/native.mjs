import { spawnSync } from "node:child_process";
import { join } from "node:path";

export class NativeUiDriver {
  constructor({ id, device, repoRoot, artifactDir }) {
    this.id = id;
    this.device = device;
    this.repoRoot = repoRoot;
    this.artifactDir = artifactDir;
  }

  runFlow(name, env = {}) {
    const flow = join(this.repoRoot, ".maestro", name);
    const result = spawnSync(
      "maestro",
      [
        "--device",
        this.device,
        "test",
        flow,
        "--format",
        "junit",
        "--output",
        join(this.artifactDir, `${this.id}-${name}.xml`),
      ],
      { cwd: this.repoRoot, encoding: "utf8", env: { ...process.env, ...env } },
    );
    if (result.status !== 0) {
      throw new Error(
        `Maestro ${name} failed on ${this.id}: ${result.stderr || result.stdout}`,
      );
    }
  }

  approveConfirmation(expectedText) {
    this.runFlow("devstudio-author.yaml", { EXPECTED_TEXT: expectedText });
  }

  approveInstall() {
    this.runFlow("devstudio-install.yaml");
  }

  approveRun() {
    this.runFlow("devstudio-run.yaml");
  }

  async screenshot() {
    // Maestro's JUnit/artifact output is retained; platform screenshot capture
    // is performed by the runner only on failure to avoid slowing every hop.
  }

  async close() {}
}
