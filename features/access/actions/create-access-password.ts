"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createUserRepository } from "../repositories/user-repository.ts";
import { USER_SESSION_COOKIE } from "../services/auth-context.ts";
import { shouldUseSecureDeviceCookie } from "../services/cookie-security.ts";
import { createInitialAdminUser } from "../services/user-auth-service.ts";
import type { CreateAccessPasswordState } from "./access-form-state";

export async function createAccessPasswordAction(
  _previousState: CreateAccessPasswordState,
  formData: FormData,
): Promise<CreateAccessPasswordState> {
  const headerStore = await headers();
  const result = await createInitialAdminUser(createUserRepository(), {
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
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
