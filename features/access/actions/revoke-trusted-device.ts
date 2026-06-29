"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAccessRepository } from "../repositories/access-repository.ts";
import { shouldUseSecureDeviceCookie } from "../services/cookie-security.ts";
import { hashDeviceToken, DEVICE_TOKEN_COOKIE } from "../services/device-token.ts";
import { revokeTrustedDevice } from "../services/access-management-service.ts";
import { requireTrustedDevice } from "../services/route-guards";

export async function revokeTrustedDeviceAction(formData: FormData) {
  await requireTrustedDevice();

  const id = String(formData.get("deviceId") ?? "");
  const repository = createAccessRepository();
  const cookieStore = await cookies();
  const headerStore = await headers();
  const currentDeviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value ?? "";
  const currentDeviceHash = currentDeviceToken ? hashDeviceToken(currentDeviceToken) : "";
  const revoked = revokeTrustedDevice(repository, id, new Date().toISOString());

  if (revoked.ok && revoked.data?.deviceIdentifierHash === currentDeviceHash) {
    cookieStore.set(DEVICE_TOKEN_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureDeviceCookie(headerStore),
      path: "/",
      maxAge: 0,
    });
  }

  revalidatePath("/settings");
}
