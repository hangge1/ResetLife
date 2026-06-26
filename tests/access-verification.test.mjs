import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createAccessRepository } from "../features/access/repositories/access-repository.ts";
import {
  createInitialAccessPassword,
  verifyAccessPasswordForDevice,
  verifyTrustedDeviceToken,
} from "../features/access/services/access-service.ts";
import { hashDeviceToken } from "../features/access/services/device-token.ts";
import * as schema from "../db/schema.ts";

function createTempRepository() {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-verify-"));
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

test("受信设备 token 校验处理缺失、错误、有效和撤销状态", async () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const initial = await createInitialAccessPassword(repository, {
      password: "12345678",
      confirmPassword: "12345678",
      userAgent: "Mozilla/5.0",
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    assert.equal(initial.ok, true);

    assert.equal(verifyTrustedDeviceToken(repository, null, "2026-06-26T00:01:00.000Z").trusted, false);
    assert.equal(verifyTrustedDeviceToken(repository, "bad-token", "2026-06-26T00:01:00.000Z").trusted, false);

    const valid = verifyTrustedDeviceToken(
      repository,
      initial.ok ? initial.deviceToken : "",
      "2026-06-26T00:02:00.000Z",
    );
    assert.equal(valid.trusted, true);
    assert.equal(valid.trusted ? valid.device.lastSeenAtIso : "", "2026-06-26T00:02:00.000Z");

    repository.revokeTrustedDevice(valid.trusted ? valid.device.id : "", "2026-06-26T00:03:00.000Z");
    assert.equal(
      verifyTrustedDeviceToken(repository, initial.ok ? initial.deviceToken : "", "2026-06-26T00:04:00.000Z").trusted,
      false,
    );
  } finally {
    cleanup();
  }
});

test("验证访问密码成功后创建受信设备，错误密码不会创建设备", async () => {
  const { repository, sqlite, cleanup } = createTempRepository();

  try {
    await createInitialAccessPassword(repository, {
      password: "12345678",
      confirmPassword: "12345678",
      userAgent: "Mozilla/5.0",
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    repository.revokeTrustedDevice(
      sqlite.prepare("select id from trusted_devices limit 1").get().id,
      "2026-06-26T00:01:00.000Z",
    );

    const wrong = await verifyAccessPasswordForDevice(repository, {
      password: "wrong-password",
      userAgent: "Mozilla/5.0",
      nowIso: "2026-06-26T00:02:00.000Z",
    });
    assert.equal(wrong.ok, false);
    assert.equal(wrong.ok ? "" : wrong.fieldErrors.password, "访问密码不正确");
    assert.equal(sqlite.prepare("select count(*) as count from trusted_devices where revoked_at_iso is null").get().count, 0);

    const correct = await verifyAccessPasswordForDevice(repository, {
      password: "12345678",
      userAgent: "Mozilla/5.0",
      nowIso: "2026-06-26T00:03:00.000Z",
    });
    assert.equal(correct.ok, true);
    assert.ok(correct.ok && correct.deviceToken.length >= 32);
    assert.equal(sqlite.prepare("select count(*) as count from trusted_devices where revoked_at_iso is null").get().count, 1);

    const activeDevice = sqlite
      .prepare("select device_identifier_hash as hash from trusted_devices where revoked_at_iso is null")
      .get();
    assert.equal(activeDevice.hash, hashDeviceToken(correct.ok ? correct.deviceToken : ""));
    assert.notEqual(activeDevice.hash, correct.ok ? correct.deviceToken : "");
  } finally {
    cleanup();
  }
});
