import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAccessRepository } from "../repositories/access-repository";
import { createUserRepository } from "../repositories/user-repository";
import { hasAccessSecret, verifyTrustedDeviceToken } from "./access-service";
import {
  DEFAULT_ADMIN_USER_ID,
  GUEST_SESSION_COOKIE,
  type AuthContext,
  USER_SESSION_COOKIE,
} from "./auth-context";
import { DEVICE_TOKEN_COOKIE } from "./device-token";
import { resolveSession } from "./user-auth-service";

export async function requireAuthContext(): Promise<AuthContext> {
  const userRepository = createUserRepository();
  const nowIso = new Date().toISOString();
  const legacyAdmin = userRepository.ensureLegacyDefaultAdmin(nowIso);
  const repository = createAccessRepository();
  const cookieStore = await cookies();
  const session = resolveSession(userRepository, cookieStore.get(USER_SESSION_COOKIE)?.value ?? null, nowIso);

  if (session.ok && session.data) {
    return {
      mode: "user",
      userId: session.data.userId,
      role: session.data.role,
    };
  }

  const guestSessionId = cookieStore.get(GUEST_SESSION_COOKIE)?.value ?? null;
  if (guestSessionId) {
    return { mode: "guest", guestSessionId };
  }

  const activeUsers = userRepository.countActiveUsers();
  if (!legacyAdmin.ok || !activeUsers.ok) {
    redirect("/access/create");
  }

  if (activeUsers.data === 0 && !(await hasAccessSecret(repository))) {
    redirect("/access/create");
  }

  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value ?? null;

  if (!verifyTrustedDeviceToken(repository, deviceToken).trusted) {
    redirect("/access/verify");
  }

  return {
    mode: "user",
    userId: DEFAULT_ADMIN_USER_ID,
    role: "admin",
  };
}

export async function requireUserAuthContext() {
  const auth = await requireAuthContext();

  if (auth.mode === "guest") {
    redirect("/");
  }

  return auth;
}

export async function requireTrustedDevice() {
  return requireAuthContext();
}
