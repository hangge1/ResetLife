type HeaderGetter = {
  get(name: string): string | null;
};

function readBooleanEnv(name: string) {
  const value = process.env[name]?.trim().toLowerCase();

  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return null;
}

function isHttpsUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function shouldUseSecureDeviceCookie(headers: HeaderGetter) {
  const forcedSecure = readBooleanEnv("SECURE_COOKIES");

  if (forcedSecure !== null) {
    return forcedSecure;
  }

  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return isHttpsUrl(headers.get("origin")) || isHttpsUrl(headers.get("referer"));
}
