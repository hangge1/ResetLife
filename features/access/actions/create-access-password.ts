"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAccessRepository } from "../repositories/access-repository.ts";
import { createInitialAccessPassword } from "../services/access-service.ts";
import { shouldUseSecureDeviceCookie } from "../services/cookie-security.ts";
import { DEVICE_TOKEN_COOKIE } from "../services/device-token.ts";
import type { CreateAccessPasswordState } from "./access-form-state";

export async function createAccessPasswordAction(
  _previousState: CreateAccessPasswordState,
  formData: FormData,
): Promise<CreateAccessPasswordState> {
  const headerStore = await headers();
  const result = await createInitialAccessPassword(createAccessRepository(), {
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
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
