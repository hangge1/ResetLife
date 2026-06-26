import type { createAccessRepository } from "../repositories/access-repository.ts";
import { createDeviceToken, hashDeviceToken } from "./device-token.ts";
import { hashAccessPassword, verifyAccessPassword } from "./password-hashing.ts";

type AccessRepository = ReturnType<typeof createAccessRepository>;

export type CreateInitialAccessPasswordInput = {
  password: string;
  confirmPassword: string;
  userAgent: string | null;
  nowIso?: string;
};

export type CreateInitialAccessPasswordResult =
  | { ok: true; deviceToken: string }
  | {
      ok: false;
      fieldErrors: {
        password?: string;
        confirmPassword?: string;
        form?: string;
      };
    };

export type VerifyAccessPasswordForDeviceInput = {
  password: string;
  userAgent: string | null;
  nowIso?: string;
};

export type VerifyAccessPasswordForDeviceResult =
  | { ok: true; deviceToken: string }
  | { ok: false; fieldErrors: { password?: string; form?: string } };

export function validateAccessPasswordInput(input: Pick<CreateInitialAccessPasswordInput, "password" | "confirmPassword">) {
  const fieldErrors: Extract<CreateInitialAccessPasswordResult, { ok: false }>["fieldErrors"] = {};

  if (!input.password) {
    fieldErrors.password = "请输入访问密码";
  } else if (input.password.length < 8) {
    fieldErrors.password = "访问密码至少需要 8 个字符";
  }

  if (input.password && !input.confirmPassword) {
    fieldErrors.confirmPassword = "请确认访问密码";
  } else if (input.password && input.confirmPassword && input.password !== input.confirmPassword) {
    fieldErrors.confirmPassword = "两次输入的访问密码不一致";
  }

  return fieldErrors;
}

export async function hasAccessSecret(repository: AccessRepository) {
  const secret = repository.getAccessSecret();
  return secret.ok && Boolean(secret.data);
}

export function verifyTrustedDeviceToken(repository: AccessRepository, deviceToken: string | null, nowIso = new Date().toISOString()) {
  if (!deviceToken) {
    return { trusted: false as const };
  }

  const found = repository.findTrustedDeviceByHash(hashDeviceToken(deviceToken));
  if (!found.ok || !found.data) {
    return { trusted: false as const };
  }

  const touched = repository.touchTrustedDevice(found.data.id, nowIso);
  if (!touched.ok || !touched.data) {
    return { trusted: false as const };
  }

  return { trusted: true as const, device: touched.data };
}

export async function verifyAccessPasswordForDevice(
  repository: AccessRepository,
  input: VerifyAccessPasswordForDeviceInput,
): Promise<VerifyAccessPasswordForDeviceResult> {
  if (!input.password) {
    return { ok: false, fieldErrors: { password: "请输入访问密码" } };
  }

  const secret = repository.getAccessSecret();
  if (!secret.ok) {
    return { ok: false, fieldErrors: { form: secret.error.message } };
  }

  if (!secret.data) {
    return { ok: false, fieldErrors: { form: "请先创建访问密码" } };
  }

  if (!(await verifyAccessPassword(input.password, secret.data.passwordHash))) {
    return { ok: false, fieldErrors: { password: "访问密码不正确" } };
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const deviceToken = createDeviceToken();
  const trustedDevice = repository.createTrustedDevice({
    deviceIdentifierHash: hashDeviceToken(deviceToken),
    displayName: "当前浏览器",
    userAgent: input.userAgent,
    nowIso,
  });

  if (!trustedDevice.ok) {
    return { ok: false, fieldErrors: { form: trustedDevice.error.message } };
  }

  return { ok: true, deviceToken };
}

export async function createInitialAccessPassword(
  repository: AccessRepository,
  input: CreateInitialAccessPasswordInput,
): Promise<CreateInitialAccessPasswordResult> {
  const fieldErrors = validateAccessPasswordInput(input);

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  if (await hasAccessSecret(repository)) {
    return { ok: false, fieldErrors: { form: "访问密码已经创建，请验证后访问" } };
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const passwordHash = await hashAccessPassword(input.password);
  const deviceToken = createDeviceToken();
  const initialAccess = repository.createInitialAccess({
    passwordHash: passwordHash.hash,
    passwordHashAlgorithm: passwordHash.algorithm,
    deviceIdentifierHash: hashDeviceToken(deviceToken),
    displayName: "当前浏览器",
    userAgent: input.userAgent,
    nowIso,
  });

  if (!initialAccess.ok) {
    return { ok: false, fieldErrors: { form: initialAccess.error.message } };
  }

  return { ok: true, deviceToken };
}
