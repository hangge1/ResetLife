import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { GUEST_SESSION_COOKIE } from "@/features/access/services/auth-context";
import { shouldUseSecureDeviceCookie } from "@/features/access/services/cookie-security";
import { createRedirectUrlFromRefererPath } from "@/features/access/services/redirect-url";

function getHomeUrl(request: Request) {
  return createRedirectUrlFromRefererPath(request, "/access/verify", "/");
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
