import type { createAccessRepository } from "../repositories/access-repository.ts";
import { hashAccessPassword, verifyAccessPassword } from "./password-hashing.ts";

type AccessRepository = ReturnType<typeof createAccessRepository>;

type ChangePasswordFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
};

export async function changeAccessPassword(
  repository: AccessRepository,
  input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    nowIso: string;
  },
) {
  const fieldErrors: ChangePasswordFieldErrors = {};

  if (!input.currentPassword) {
    fieldErrors.currentPassword = "请输入当前访问密码";
  }

  if (!input.newPassword) {
    fieldErrors.newPassword = "请输入新访问密码";
  } else if (input.newPassword.length < 8) {
    fieldErrors.newPassword = "新访问密码至少需要 8 个字符";
  }

  if (input.newPassword && !input.confirmPassword) {
    fieldErrors.confirmPassword = "请确认新访问密码";
  } else if (input.newPassword && input.confirmPassword && input.newPassword !== input.confirmPassword) {
    fieldErrors.confirmPassword = "两次输入的新访问密码不一致";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false as const, fieldErrors };
  }

  const secret = repository.getAccessSecret();
  if (!secret.ok) {
    return { ok: false as const, fieldErrors: { form: secret.error.message } };
  }

  if (!secret.data) {
    return { ok: false as const, fieldErrors: { form: "请先创建访问密码" } };
  }

  if (!(await verifyAccessPassword(input.currentPassword, secret.data.passwordHash))) {
    return { ok: false as const, fieldErrors: { currentPassword: "当前访问密码不正确" } };
  }

  const passwordHash = await hashAccessPassword(input.newPassword);
  const saved = repository.saveAccessSecret({
    passwordHash: passwordHash.hash,
    passwordHashAlgorithm: passwordHash.algorithm,
    nowIso: input.nowIso,
  });

  if (!saved.ok) {
    return { ok: false as const, fieldErrors: { form: saved.error.message } };
  }

  return { ok: true as const };
}

export function listTrustedDevices(repository: AccessRepository) {
  return repository.listTrustedDevices();
}

export function revokeTrustedDevice(repository: AccessRepository, id: string, nowIso: string) {
  return repository.revokeTrustedDevice(id, nowIso);
}
