import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createAccessRepository } from "../features/access/repositories/access-repository.ts";
import { closeDefaultConnectionForTests } from "../db/client.ts";
import * as schema from "../db/schema.ts";

function createTempRepository() {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-"));
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

test("访问密码只以哈希元数据保存", () => {
  const { repository, sqlite, cleanup } = createTempRepository();

  try {
    const saved = repository.saveAccessSecret({
      passwordHash: "hash:v1:abc",
      passwordHashAlgorithm: "test-hash",
      nowIso: "2026-06-26T00:00:00.000Z",
    });

    assert.equal(saved.ok, true);

    const found = repository.getAccessSecret();
    assert.equal(found.ok, true);
    assert.equal(found.data?.passwordHash, "hash:v1:abc");
    assert.equal(found.data?.passwordHashAlgorithm, "test-hash");

    const columns = sqlite.prepare("PRAGMA table_info(access_secrets)").all();
    const columnNames = columns.map((column) => column.name);
    assert.deepEqual(columnNames.sort(), [
      "created_at_iso",
      "id",
      "password_hash",
      "password_hash_algorithm",
      "updated_at_iso",
    ]);
    assert.equal(columnNames.includes("password"), false);
    assert.equal(columnNames.includes("plain_password"), false);

    const rows = sqlite.prepare("select id from access_secrets").all();
    assert.deepEqual(rows, [{ id: "current" }]);
    assert.throws(() =>
      sqlite
        .prepare(
          "insert into access_secrets (id, password_hash, password_hash_algorithm, created_at_iso, updated_at_iso) values (?, ?, ?, ?, ?)",
        )
        .run("another", "hash:v1:def", "test-hash", "2026-06-26T00:01:00.000Z", "2026-06-26T00:01:00.000Z"),
    );

    const updated = repository.saveAccessSecret({
      passwordHash: "hash:v1:updated",
      passwordHashAlgorithm: "test-hash-v2",
      nowIso: "2026-06-26T00:02:00.000Z",
    });
    assert.equal(updated.ok, true);
    assert.equal(sqlite.prepare("select count(*) as count from access_secrets").get().count, 1);
    assert.equal(updated.data.id, "current");
    assert.equal(updated.data.passwordHash, "hash:v1:updated");
  } finally {
    cleanup();
  }
});

test("受信设备保存哈希、保持唯一，并支持撤销", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const first = repository.createTrustedDevice({
      deviceIdentifierHash: "device-hash-1",
      displayName: "Windows Chrome",
      userAgent: "Mozilla/5.0",
      nowIso: "2026-06-26T00:00:00.000Z",
    });

    assert.equal(first.ok, true);

    const duplicate = repository.createTrustedDevice({
      deviceIdentifierHash: "device-hash-1",
      displayName: "Duplicate",
      userAgent: null,
      nowIso: "2026-06-26T00:01:00.000Z",
    });

    assert.equal(duplicate.ok, false);
    assert.equal(duplicate.error.code, "duplicate_device");

    const found = repository.findTrustedDeviceByHash("device-hash-1");
    assert.equal(found.ok, true);
    assert.equal(found.data?.displayName, "Windows Chrome");
    assert.equal(found.data?.revokedAtIso, null);

    const touched = repository.touchTrustedDevice(first.data.id, "2026-06-26T00:02:00.000Z");
    assert.equal(touched.ok, true);
    assert.equal(touched.data?.lastSeenAtIso, "2026-06-26T00:02:00.000Z");

    const revoked = repository.revokeTrustedDevice(first.data.id, "2026-06-26T00:03:00.000Z");
    assert.equal(revoked.ok, true);
    assert.equal(revoked.data?.revokedAtIso, "2026-06-26T00:03:00.000Z");

    const foundAfterRevoke = repository.findTrustedDeviceByHash("device-hash-1");
    assert.equal(foundAfterRevoke.ok, true);
    assert.equal(foundAfterRevoke.data, null);

    const touchedAfterRevoke = repository.touchTrustedDevice(first.data.id, "2026-06-26T00:04:00.000Z");
    assert.equal(touchedAfterRevoke.ok, true);
    assert.equal(touchedAfterRevoke.data, null);

    const trustedAgain = repository.createTrustedDevice({
      deviceIdentifierHash: "device-hash-1",
      displayName: "Windows Chrome Again",
      userAgent: "Mozilla/5.0",
      nowIso: "2026-06-26T00:05:00.000Z",
    });
    assert.equal(trustedAgain.ok, true);
    assert.equal(trustedAgain.data.id, first.data.id);
    assert.equal(trustedAgain.data.revokedAtIso, null);
    assert.equal(trustedAgain.data.displayName, "Windows Chrome Again");
  } finally {
    cleanup();
  }
});

test("默认 repository 会自动迁移新 SQLite 数据库", () => {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-default-"));
  const previousSqlitePath = process.env.SQLITE_PATH;
  process.env.SQLITE_PATH = join(dir, "default.sqlite");

  try {
    closeDefaultConnectionForTests();
    const repository = createAccessRepository();
    const saved = repository.saveAccessSecret({
      passwordHash: "hash:v1:default",
      passwordHashAlgorithm: "test-hash",
      nowIso: "2026-06-26T00:00:00.000Z",
    });

    assert.equal(saved.ok, true);
    assert.equal(saved.data.id, "current");
  } finally {
    closeDefaultConnectionForTests();
    if (previousSqlitePath === undefined) {
      delete process.env.SQLITE_PATH;
    } else {
      process.env.SQLITE_PATH = previousSqlitePath;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test("迁移脚本可以从项目外工作目录运行", () => {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-script-"));
  const sqlitePath = join(dir, "script.sqlite");

  try {
    const result = spawnSync(process.execPath, [join(process.cwd(), "scripts/migrate-db.mjs")], {
      cwd: tmpdir(),
      env: { ...process.env, SQLITE_PATH: sqlitePath },
      stdio: "pipe",
    });

    assert.equal(result.status, 0, `${result.stderr.toString()}\n${result.stdout.toString()}`);

    const sqlite = new Database(sqlitePath);
    try {
      const tables = sqlite
        .prepare("select name from sqlite_master where type = 'table' order by name")
        .all()
        .map((row) => row.name);

      assert.ok(tables.includes("access_secrets"));
      assert.ok(tables.includes("trusted_devices"));
    } finally {
      sqlite.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
