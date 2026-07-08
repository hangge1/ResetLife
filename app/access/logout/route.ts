import { type NextRequest, NextResponse } from "next/server";
import { createUserRepository } from "@/features/access/repositories/user-repository";
import { GUEST_SESSION_COOKIE, USER_SESSION_COOKIE } from "@/features/access/services/auth-context";
import { DEVICE_TOKEN_COOKIE } from "@/features/access/services/device-token";
import { createRedirectUrl } from "@/features/access/services/redirect-url";
import { hashSessionToken } from "@/features/access/services/user-auth-service";
import { deleteGuestSession } from "@/features/guest/repositories/guest-repositories";

function clearAuthCookies(response: NextResponse) {
  for (const name of [USER_SESSION_COOKIE, GUEST_SESSION_COOKIE, DEVICE_TOKEN_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
  }
}

async function logout(request: NextRequest) {
  const nowIso = new Date().toISOString();
  const response = NextResponse.redirect(createRedirectUrl(request, "/access/verify"), 303);
  const userSessionToken = request.cookies.get(USER_SESSION_COOKIE)?.value;
  const guestSessionId = request.cookies.get(GUEST_SESSION_COOKIE)?.value;

  if (userSessionToken) {
    createUserRepository().revokeSessionByHash(hashSessionToken(userSessionToken), nowIso);
  }

  if (guestSessionId) {
    deleteGuestSession(guestSessionId);
  }

  clearAuthCookies(response);
  return response;
}

export async function POST(request: NextRequest) {
  return logout(request);
}

export async function GET(request: NextRequest) {
  return logout(request);
}
