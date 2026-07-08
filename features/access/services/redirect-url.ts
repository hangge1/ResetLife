type HeaderGetter = {
  get(name: string): string | null;
};

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function normalizeDefaultPort(host: string, proto: string) {
  const url = new URL(`${proto}://${host}`);

  return url.host;
}

function isUnsafeRedirectHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  return normalized === "0.0.0.0" || normalized === "::" || normalized === "[::]";
}

function readForwardedOrigin(headers: HeaderGetter, requestUrl: string) {
  const request = new URL(requestUrl);
  const proto =
    firstHeaderValue(headers.get("x-forwarded-proto")) ??
    firstHeaderValue(headers.get("x-scheme")) ??
    request.protocol.replace(":", "") ??
    "http";
  const host =
    firstHeaderValue(headers.get("x-forwarded-host")) ??
    firstHeaderValue(headers.get("x-host")) ??
    firstHeaderValue(headers.get("host"));

  if (!host) {
    return null;
  }

  try {
    const normalizedHost = normalizeDefaultPort(host, proto);
    const origin = new URL(`${proto}://${normalizedHost}`);

    if (isUnsafeRedirectHostname(origin.hostname)) {
      return null;
    }

    return origin.origin;
  } catch {
    return null;
  }
}

function readSafeRefererOrigin(headers: HeaderGetter) {
  const referer = headers.get("referer");

  if (!referer) {
    return null;
  }

  try {
    const url = new URL(referer);

    if (isUnsafeRedirectHostname(url.hostname)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function createRedirectUrl(request: Request, pathname: string) {
  const origin = readSafeRefererOrigin(request.headers) ?? readForwardedOrigin(request.headers, request.url);

  if (origin) {
    return new URL(pathname, origin);
  }

  return new URL(pathname, request.url);
}

export function createRedirectUrlFromRefererPath(request: Request, marker: string, fallbackPathname: string) {
  const referer = request.headers.get("referer");

  if (referer) {
    try {
      const url = new URL(referer);

      if (!isUnsafeRedirectHostname(url.hostname) && url.pathname.endsWith(marker)) {
        const basePath = url.pathname.slice(0, -marker.length);
        return new URL(basePath ? `${basePath}/` : "/", url.origin);
      }
    } catch {
      // Fall back to forwarded headers or the request URL.
    }
  }

  return createRedirectUrl(request, fallbackPathname);
}
