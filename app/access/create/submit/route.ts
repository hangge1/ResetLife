import { NextResponse } from "next/server";
import { createUserRepository } from "@/features/access/repositories/user-repository";
import { USER_SESSION_COOKIE } from "@/features/access/services/auth-context";
import { shouldUseSecureDeviceCookie } from "@/features/access/services/cookie-security";
import { createRedirectUrl, createRedirectUrlFromRefererPath } from "@/features/access/services/redirect-url";
import { createInitialAdminUser } from "@/features/access/services/user-auth-service";

function redirectWithErrors(request: Request, fieldErrors: { username?: string; password?: string; confirmPassword?: string; form?: string }) {
  const url = getAccessPageUrl(request, "create");

  for (const [field, message] of Object.entries(fieldErrors)) {
    if (message) {
      url.searchParams.set(field, message);
    }
  }

  return NextResponse.redirect(url, { status: 303 });
}

function getAccessPageUrl(request: Request, page: "create" | "verify") {
  return createRedirectUrl(request, `/access/${page}`);
}

function getHomeUrl(request: Request) {
  return createRedirectUrlFromRefererPath(request, "/access/create", "/");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await createInitialAdminUser(createUserRepository(), {
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!result.ok) {
    return redirectWithErrors(request, result.fieldErrors);
  }

  const response = NextResponse.redirect(getHomeUrl(request), { status: 303 });
  response.cookies.set(USER_SESSION_COOKIE, result.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureDeviceCookie(request.headers),
    path: "/",
    expires: new Date(result.expiresAtIso),
  });

  return response;
}
