#!/usr/bin/env node

import { execFile } from "node:child_process";

export function openBrowser(url) {
  const platform = process.platform;

  if (platform === "darwin") {
    execFile("open", [url], () => {});
    return;
  }

  if (platform === "win32") {
    execFile("cmd", ["/c", "start", "", url], () => {});
    return;
  }

  execFile("xdg-open", [url], () => {});
}
