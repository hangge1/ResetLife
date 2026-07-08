import { createHash, randomBytes } from "node:crypto";
import type { createUserRepository } from "../repositories/user-repository.ts";
import { type UserRole } from "./auth-context.ts";
import { hashAccessPassword, verifyAccessPassword } from "./password-hashing.ts";

type UserRepository = ReturnType<typeof createUserRepository>;

export type CreateInitialAdminInput = {
  username: string;
  displayName?: string | null;
  password: string;
  confirmPassword: string;
  nowIso?: string;
};

export type LoginInput = {
  username: string;
  password: string;
  nowIso?: string;
};

export type ChangeUserPasswordInput = {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  nowIso?: string;
};

export type UserAuthResult =
  | {
      ok: true;
      userId: string;
      username: string;
      displayName: string | null;
      role: UserRole;
      sessionToken: string;
      expiresAtIso: string;
    }
  | { ok: false; fieldErrors: { username?: string; password?: string; confirmPassword?: string; form?: string } };

const SESSION_MAX_AGE_DAYS = 30;

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function addDaysIso(nowIso: string, days: number) {
  const date = new Date(nowIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function validateUsername(username: string) {
  if (!username) {
    return "请输入用户名";
  }

  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
    return "用户名只能包含 3-32 位字母、数字、下划线或短横线";
  }

  return undefined;
}

function validatePassword(password: string) {
  if (!password) {
    return "请输入密码";
  }

  if (password.length < 8) {
    return "密码至少需要 8 个字符";
  }

  return undefined;
}

async function createSessionForUser(
  repository: UserRepository,
  input: { userId: string; username: string; displayName: string | null; role: UserRole; nowIso: string },
) {
  const sessionToken = createSessionToken();
  const expiresAtIso = addDaysIso(input.nowIso, SESSION_MAX_AGE_DAYS);
  const session = repository.createSession({
    userId: input.userId,
    sessionTokenHash: hashSessionToken(sessionToken),
    nowIso: input.nowIso,
    expiresAtIso,
  });

  if (!session.ok) {
    return { ok: false as const, fieldErrors: { form: session.error.message } };
  }

  return {
    ok: true as const,
    userId: input.userId,
    username: input.username,
    displayName: input.displayName,
    role: input.role,
    sessionToken,
    expiresAtIso,
  };
}

export async function createInitialAdminUser(
  repository: UserRepository,
  input: CreateInitialAdminInput,
): Promise<UserAuthResult> {
  const fieldErrors: Extract<UserAuthResult, { ok: false }>["fieldErrors"] = {};
  const username = input.username.trim();
  const nowIso = input.nowIso ?? new Date().toISOString();

  fieldErrors.username = validateUsername(username);
  fieldErrors.password = validatePassword(input.password);

  if (input.password && !input.confirmPassword) {
    fieldErrors.confirmPassword = "请确认密码";
  } else if (input.password && input.confirmPassword && input.password !== input.confirmPassword) {
    fieldErrors.confirmPassword = "两次输入的密码不一致";
  }

  for (const key of Object.keys(fieldErrors) as Array<keyof typeof fieldErrors>) {
    if (!fieldErrors[key]) {
      delete fieldErrors[key];
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const activeUserCount = repository.countActiveUsers();
  if (!activeUserCount.ok) {
    return { ok: false, fieldErrors: { form: activeUserCount.error.message } };
  }

  if (activeUserCount.data > 0) {
    return { ok: false, fieldErrors: { form: "管理员账号已经创建，请直接登录" } };
  }

  const passwordHash = await hashAccessPassword(input.password);
  const created = repository.createUser({
    username,
    displayName: input.displayName?.trim() || "管理员",
    role: "admin",
    passwordHash: passwordHash.hash,
    passwordHashAlgorithm: passwordHash.algorithm,
    nowIso,
  });

  if (!created.ok) {
    return { ok: false, fieldErrors: { form: created.error.message } };
  }

  return createSessionForUser(repository, {
    userId: created.data.id,
    username: created.data.username,
    displayName: created.data.displayName,
    role: "admin",
    nowIso,
  });
}

export async function loginUser(repository: UserRepository, input: LoginInput): Promise<UserAuthResult> {
  const username = input.username.trim();
  const fieldErrors: Extract<UserAuthResult, { ok: false }>["fieldErrors"] = {};
  const nowIso = input.nowIso ?? new Date().toISOString();

  if (!username) {
    fieldErrors.username = "请输入用户名";
  }

  if (!input.password) {
    fieldErrors.password = "请输入密码";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const legacy = repository.ensureLegacyDefaultAdmin(nowIso);
  if (!legacy.ok) {
    return { ok: false, fieldErrors: { form: legacy.error.message } };
  }

  const found = repository.getUserByUsername(username);
  if (!found.ok) {
    return { ok: false, fieldErrors: { form: found.error.message } };
  }

  if (!found.data || !(await verifyAccessPassword(input.password, found.data.passwordHash))) {
    return { ok: false, fieldErrors: { form: "用户名或密码不正确" } };
  }

  return createSessionForUser(repository, {
    userId: found.data.id,
    username: found.data.username,
    displayName: found.data.displayName,
    role: found.data.role as UserRole,
    nowIso,
  });
}

export function resolveSession(repository: UserRepository, sessionToken: string | null, nowIso = new Date().toISOString()) {
  if (!sessionToken) {
    return { ok: true as const, data: null };
  }

  const session = repository.findActiveSessionByHash(hashSessionToken(sessionToken), nowIso);
  if (!session.ok || !session.data) {
    return session.ok ? { ok: true as const, data: null } : session;
  }

  const user = repository.getUserById(session.data.userId);
  if (!user.ok || !user.data) {
    return user.ok ? { ok: true as const, data: null } : user;
  }

  return {
    ok: true as const,
    data: {
      userId: user.data.id,
      role: user.data.role as UserRole,
    },
  };
}

export async function changeUserPassword(repository: UserRepository, input: ChangeUserPasswordInput) {
  const fieldErrors: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    form?: string;
  } = {};

  if (!input.currentPassword) {
    fieldErrors.currentPassword = "请输入当前密码";
  }

  fieldErrors.newPassword = validatePassword(input.newPassword);

  if (input.newPassword && !input.confirmPassword) {
    fieldErrors.confirmPassword = "请确认新密码";
  } else if (input.newPassword && input.confirmPassword && input.newPassword !== input.confirmPassword) {
    fieldErrors.confirmPassword = "两次输入的新密码不一致";
  }

  for (const key of Object.keys(fieldErrors) as Array<keyof typeof fieldErrors>) {
    if (!fieldErrors[key]) {
      delete fieldErrors[key];
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false as const, fieldErrors };
  }

  const user = repository.getUserById(input.userId);
  if (!user.ok) {
    return { ok: false as const, fieldErrors: { form: user.error.message } };
  }

  if (!user.data || !(await verifyAccessPassword(input.currentPassword, user.data.passwordHash))) {
    return { ok: false as const, fieldErrors: { currentPassword: "当前密码不正确" } };
  }

  const passwordHash = await hashAccessPassword(input.newPassword);
  const saved = repository.updateUserPassword({
    userId: input.userId,
    passwordHash: passwordHash.hash,
    passwordHashAlgorithm: passwordHash.algorithm,
    nowIso: input.nowIso ?? new Date().toISOString(),
  });

  if (!saved.ok) {
    return { ok: false as const, fieldErrors: { form: saved.error.message } };
  }

  return { ok: true as const };
}
