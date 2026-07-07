"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createUserRepository } from "../repositories/user-repository.ts";
import { USER_SESSION_COOKIE } from "../services/auth-context.ts";
import { shouldUseSecureDeviceCookie } from "../services/cookie-security.ts";
import { loginUser } from "../services/user-auth-service.ts";
import type { VerifyAccessPasswordState } from "./access-form-state";

export async function verifyAccessPasswordAction(
  _previousState: VerifyAccessPasswordState,
  formData: FormData,
): Promise<VerifyAccessPasswordState> {
  const headerStore = await headers();
  const result = await loginUser(createUserRepository(), {
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) {
    return { fieldErrors: result.fieldErrors };
  }

  const cookieStore = await cookies();
  cookieStore.set(USER_SESSION_COOKIE, result.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureDeviceCookie(headerStore),
    path: "/",
    expires: new Date(result.expiresAtIso),
  });

  redirect("/");
}
