import { NextResponse } from "next/server";
import { createAccessRepository } from "@/features/access/repositories/access-repository";
import { verifyAccessPasswordForDevice } from "@/features/access/services/access-service";
import { shouldUseSecureDeviceCookie } from "@/features/access/services/cookie-security";
import { DEVICE_TOKEN_COOKIE } from "@/features/access/services/device-token";

function redirectWithErrors(
  request: Request,
  fieldErrors: {
    password?: string;
    form?: string;
  },
) {
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
  const result = await verifyAccessPasswordForDevice(createAccessRepository(), {
    password: String(formData.get("password") ?? ""),
    userAgent: request.headers.get("user-agent"),
  });

  if (!result.ok) {
    return redirectWithErrors(request, result.fieldErrors);
  }

  const response = NextResponse.redirect(getHomeUrl(request), { status: 303 });
  response.cookies.set(DEVICE_TOKEN_COOKIE, result.deviceToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureDeviceCookie(request.headers),
    path: "/",
  });

  return response;
}
