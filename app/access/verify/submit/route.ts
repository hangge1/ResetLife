import { NextResponse } from "next/server";
import { createUserRepository } from "@/features/access/repositories/user-repository";
import { USER_SESSION_COOKIE } from "@/features/access/services/auth-context";
import { shouldUseSecureDeviceCookie } from "@/features/access/services/cookie-security";
import { createRedirectUrl, createRedirectUrlFromRefererPath } from "@/features/access/services/redirect-url";
import { loginUser } from "@/features/access/services/user-auth-service";

function redirectWithErrors(request: Request, fieldErrors: { username?: string; password?: string; form?: string }) {
  const url = getAccessPageUrl(request, "verify");

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
  return createRedirectUrlFromRefererPath(request, "/access/verify", "/");
}

function addWelcomeSearchParam(url: URL, name: string) {
  const welcomeName = name.trim().slice(0, 32);

  if (welcomeName) {
    url.searchParams.set("welcome", welcomeName);
  }

  return url;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await loginUser(createUserRepository(), {
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) {
    return redirectWithErrors(request, result.fieldErrors);
  }

  const response = NextResponse.redirect(
    addWelcomeSearchParam(getHomeUrl(request), result.displayName || result.username),
    { status: 303 },
  );
  response.cookies.set(USER_SESSION_COOKIE, result.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureDeviceCookie(request.headers),
    path: "/",
    expires: new Date(result.expiresAtIso),
  });

  return response;
}
