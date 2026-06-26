import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createAccessRepository } from "../features/access/repositories/access-repository.ts";
import { createInitialAccessPassword } from "../features/access/services/access-service.ts";
import { createDeviceToken, hashDeviceToken } from "../features/access/services/device-token.ts";
import { hashAccessPassword, verifyAccessPassword } from "../features/access/services/password-hashing.ts";
import * as schema from "../db/schema.ts";

function createTempRepository() {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-access-"));
  const sqlitePath = join(dir, "test.sqlite");
  const sqlite = new Database(sqlitePath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });

  return {
    repository: createAccessRepository(db),
    sqlite,
    cleanup() {
      sqlite.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("访问密码哈希不包含明文，并且同密码每次 salt 不同", async () => {
  const first = await hashAccessPassword("correct horse battery staple");
  const second = await hashAccessPassword("correct horse battery staple");

  assert.match(first.hash, /^scrypt:v1:/);
  assert.notEqual(first.hash, second.hash);
  assert.equal(first.hash.includes("correct horse battery staple"), false);
  assert.equal(await verifyAccessPassword("correct horse battery staple", first.hash), true);
  assert.equal(await verifyAccessPassword("wrong password", first.hash), false);
  assert.equal(await verifyAccessPassword("anything", "scrypt:v1:not-a-number:8:1:salt:digest"), false);
  assert.equal(await verifyAccessPassword("anything", "not-a-valid-hash"), false);
});

test("设备 token 只以哈希形式保存", () => {
  const token = createDeviceToken();
  const tokenHash = hashDeviceToken(token);

  assert.equal(token.length >= 32, true);
  assert.notEqual(token, tokenHash);
  assert.equal(tokenHash.includes(token), false);
});

test("首次创建访问密码会保存密码哈希并信任当前设备", async () => {
  const { repository, sqlite, cleanup } = createTempRepository();

  try {
    const result = await createInitialAccessPassword(repository, {
      password: "12345678",
      confirmPassword: "12345678",
      userAgent: "Mozilla/5.0",
      nowIso: "2026-06-26T00:00:00.000Z",
    });

    assert.equal(result.ok, true);
    assert.ok(result.ok && result.deviceToken.length >= 32);

    const secret = repository.getAccessSecret();
    assert.equal(secret.ok, true);
    assert.match(secret.data?.passwordHash ?? "", /^scrypt:v1:/);
    assert.equal(secret.data?.passwordHash.includes("12345678"), false);

    const devices = sqlite.prepare("select * from trusted_devices").all();
    assert.equal(devices.length, 1);
    assert.notEqual(devices[0].device_identifier_hash, result.ok && result.deviceToken);
  } finally {
    cleanup();
  }
});

test("首次创建访问密码不会覆盖已存在密码", async () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const first = await createInitialAccessPassword(repository, {
      password: "first-password",
      confirmPassword: "first-password",
      userAgent: "Mozilla/5.0",
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    assert.equal(first.ok, true);

    const originalSecret = repository.getAccessSecret();
    assert.equal(originalSecret.ok, true);

    const second = await createInitialAccessPassword(repository, {
      password: "second-password",
      confirmPassword: "second-password",
      userAgent: "Mozilla/5.0",
      nowIso: "2026-06-26T00:01:00.000Z",
    });
    assert.equal(second.ok, false);
    assert.equal(second.ok ? "" : second.fieldErrors.form, "访问密码已经创建，请验证后访问");

    const currentSecret = repository.getAccessSecret();
    assert.equal(currentSecret.ok, true);
    assert.equal(currentSecret.data?.passwordHash, originalSecret.data?.passwordHash);
  } finally {
    cleanup();
  }
});

test("首次创建访问密码写入设备失败时会回滚密码", async () => {
  const { repository, cleanup } = createTempRepository();
  const failingRepository = {
    ...repository,
    createInitialAccess() {
      return { ok: false, error: { code: "database_error", message: "设备写入失败" } };
    },
  };

  try {
    const result = await createInitialAccessPassword(failingRepository, {
      password: "12345678",
      confirmPassword: "12345678",
      userAgent: "Mozilla/5.0",
      nowIso: "2026-06-26T00:00:00.000Z",
    });

    assert.equal(result.ok, false);
    assert.equal(repository.getAccessSecret().ok && repository.getAccessSecret().data, null);
  } finally {
    cleanup();
  }
});

test("首次创建访问密码返回中文字段错误", async () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const empty = await createInitialAccessPassword(repository, {
      password: "",
      confirmPassword: "",
      userAgent: null,
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    assert.equal(empty.ok, false);
    assert.equal(empty.ok ? "" : empty.fieldErrors.password, "请输入访问密码");

    const short = await createInitialAccessPassword(repository, {
      password: "123",
      confirmPassword: "123",
      userAgent: null,
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    assert.equal(short.ok, false);
    assert.equal(short.ok ? "" : short.fieldErrors.password, "访问密码至少需要 8 个字符");

    const mismatch = await createInitialAccessPassword(repository, {
      password: "12345678",
      confirmPassword: "87654321",
      userAgent: null,
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.ok ? "" : mismatch.fieldErrors.confirmPassword, "两次输入的访问密码不一致");

    const missingConfirm = await createInitialAccessPassword(repository, {
      password: "12345678",
      confirmPassword: "",
      userAgent: null,
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    assert.equal(missingConfirm.ok, false);
    assert.equal(missingConfirm.ok ? "" : missingConfirm.fieldErrors.confirmPassword, "请确认访问密码");
  } finally {
    cleanup();
  }
});
