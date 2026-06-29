"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAccessRepository } from "../repositories/access-repository.ts";
import { verifyAccessPasswordForDevice } from "../services/access-service.ts";
import { shouldUseSecureDeviceCookie } from "../services/cookie-security.ts";
import { DEVICE_TOKEN_COOKIE } from "../services/device-token.ts";
import type { VerifyAccessPasswordState } from "./access-form-state";

export async function verifyAccessPasswordAction(
  _previousState: VerifyAccessPasswordState,
  formData: FormData,
): Promise<VerifyAccessPasswordState> {
  const headerStore = await headers();
  const result = await verifyAccessPasswordForDevice(createAccessRepository(), {
    password: String(formData.get("password") ?? ""),
    userAgent: headerStore.get("user-agent"),
  });

  if (!result.ok) {
    return { fieldErrors: result.fieldErrors };
  }

  const cookieStore = await cookies();
  cookieStore.set(DEVICE_TOKEN_COOKIE, result.deviceToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureDeviceCookie(headerStore),
    path: "/",
  });

  redirect("/");
}
