import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { GUEST_SESSION_COOKIE } from "@/features/access/services/auth-context";
import { shouldUseSecureDeviceCookie } from "@/features/access/services/cookie-security";

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
  const response = NextResponse.redirect(getHomeUrl(request), { status: 303 });
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 120);

  response.cookies.set(GUEST_SESSION_COOKIE, randomBytes(24).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureDeviceCookie(request.headers),
    path: "/",
    expires,
  });

  return response;
}
