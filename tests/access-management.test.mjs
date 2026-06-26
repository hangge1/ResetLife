import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createAccessRepository } from "../features/access/repositories/access-repository.ts";
import { changeAccessPassword, listTrustedDevices } from "../features/access/services/access-management-service.ts";
import { createInitialAccessPassword } from "../features/access/services/access-service.ts";
import * as schema from "../db/schema.ts";

function createTempRepository() {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-access-management-"));
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

test("修改访问密码会校验当前密码并只保存哈希", async () => {
  const { repository, sqlite, cleanup } = createTempRepository();

  try {
    await createInitialAccessPassword(repository, {
      password: "old-password",
      confirmPassword: "old-password",
      userAgent: "node-test",
      nowIso: "2026-06-26T00:00:00.000Z",
    });

    const wrong = await changeAccessPassword(repository, {
      currentPassword: "bad-password",
      newPassword: "new-password",
      confirmPassword: "new-password",
      nowIso: "2026-06-26T01:00:00.000Z",
    });
    assert.equal(wrong.ok, false);
    assert.equal(wrong.ok ? "" : wrong.fieldErrors.currentPassword, "当前访问密码不正确");

    const changed = await changeAccessPassword(repository, {
      currentPassword: "old-password",
      newPassword: "new-password",
      confirmPassword: "new-password",
      nowIso: "2026-06-26T02:00:00.000Z",
    });
    const row = sqlite.prepare("select password_hash as passwordHash from access_secrets").get();

    assert.equal(changed.ok, true);
    assert.notEqual(row.passwordHash, "new-password");
    assert.match(row.passwordHash, /^scrypt:v1:/);
  } finally {
    cleanup();
  }
});

test("可以列出未撤销的受信设备", async () => {
  const { repository, cleanup } = createTempRepository();

  try {
    await createInitialAccessPassword(repository, {
      password: "old-password",
      confirmPassword: "old-password",
      userAgent: "node-test",
      nowIso: "2026-06-26T00:00:00.000Z",
    });

    const devices = listTrustedDevices(repository);

    assert.equal(devices.ok, true);
    assert.equal(devices.ok ? devices.data.length : 0, 1);
    assert.equal(devices.ok ? devices.data[0].displayName : "", "当前浏览器");
  } finally {
    cleanup();
  }
});
