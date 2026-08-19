/**
 * node:os import-map target for BareKit worklets. iOS Bare does not ship `os`.
 */
export function networkInterfaces() {
  return {};
}

export function homedir() {
  return "/";
}

export function tmpdir() {
  return "/tmp";
}

export function platform() {
  return "bare";
}

export default {
  networkInterfaces,
  homedir,
  tmpdir,
  platform,
};
