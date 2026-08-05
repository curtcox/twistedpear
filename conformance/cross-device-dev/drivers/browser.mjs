import { chromium } from "playwright";

export class BrowserUiDriver {
  static async connect({ id, cdpPort }) {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
    const context = browser.contexts()[0];
    const page = context?.pages()[0];
    if (page === undefined) throw new Error(`${id}: CDP connected without a page`);
    return new BrowserUiDriver(id, browser, page);
  }

  constructor(id, browser, page) {
    this.id = id;
    this.browser = browser;
    this.page = page;
  }

  command(command, payload = {}) {
    if (this.id !== "web") throw new Error("In-page commands are only available on the web peer");
    return this.page.evaluate(
      ({ command, payload }) => globalThis.__TP_CROSS_DEVICE__.command(command, payload),
      { command, payload }
    );
  }

  async approveConfirmation(expectedText) {
    if (this.id === "desktop") {
      const modal = this.page.locator("#host-modal");
      await modal.getByText(expectedText, { exact: false }).waitFor({ timeout: 30_000 });
      await modal.locator(".fingerprint").waitFor();
      await modal.locator("button.primary").click();
      return;
    }
    const modal = this.page.getByTestId("host-confirmation-modal");
    await modal.getByText(expectedText, { exact: false }).waitFor({ timeout: 30_000 });
    await this.page.getByTestId("host-confirm-approve").click();
  }

  async approveInstall() {
    if (this.id === "desktop") {
      const modal = this.page.locator("#host-modal");
      await modal.getByText("storage:kv", { exact: false }).waitFor({ timeout: 60_000 });
      await modal.getByText("lxmf:send", { exact: false }).waitFor();
      await modal.locator('input[data-capability-id="storage:kv"]').check();
      await modal.locator('input[data-capability-id="lxmf:send"]').uncheck();
      await modal.locator("button.primary").click();
      return;
    }
    await this.page.getByTestId("host-confirmation-modal").waitFor({ timeout: 60_000 });
    await this.page.getByTestId("install-grant-storage:kv").click();
    await this.page.getByTestId("host-install-approve").click();
  }

  async approveRun() {
    if (this.id === "desktop") {
      const modal = this.page.locator("#host-modal");
      await modal.getByText("storage:kv", { exact: false }).waitFor({ timeout: 30_000 });
      await modal.locator('input[data-capability-id="storage:kv"]').check();
      await modal.locator('input[data-capability-id="lxmf:send"]').uncheck();
      await modal.locator("button.primary").click();
      return;
    }
    await this.page.getByTestId("host-confirmation-modal").waitFor({ timeout: 30_000 });
    await this.page.getByTestId("host-launch-run").click();
  }

  async screenshot(path) {
    await this.page.screenshot({ path, fullPage: true });
  }

  async close() {
    await this.browser.close();
  }
}
