import { NextResponse } from "next/server";
import { createUserRepository } from "@/features/access/repositories/user-repository";
import { USER_SESSION_COOKIE } from "@/features/access/services/auth-context";
import { shouldUseSecureDeviceCookie } from "@/features/access/services/cookie-security";
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
  const referer = request.headers.get("referer");

  if (referer) {
    const url = new URL(referer);
    url.search = "";
    url.hash = "";
    return url;
  }

  return new URL(`/access/${page}`, request.url);
}

function getHomeUrl(request: Request) {
  const referer = request.headers.get("referer");
  const marker = "/access/verify";

  if (referer) {
    const url = new URL(referer);

    if (url.pathname.endsWith(marker)) {
      const basePath = url.pathname.slice(0, -marker.length);
      url.pathname = basePath ? `${basePath}/` : "/";
      url.search = "";
      url.hash = "";
      return url;
    }
  }

  return new URL("/", request.url);
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
