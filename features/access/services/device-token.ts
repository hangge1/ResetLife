import { createHash, randomBytes } from "node:crypto";

export const DEVICE_TOKEN_COOKIE = "slimming_device_token";

export function createDeviceToken() {
  return randomBytes(32).toString("base64url");
}

export function hashDeviceToken(deviceToken: string) {
  return createHash("sha256").update(deviceToken).digest("base64url");
}
