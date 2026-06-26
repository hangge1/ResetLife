import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createSettingsRepository } from "../features/settings/repositories/settings-repository.ts";
import { getSettingValue, saveSettingValue } from "../features/settings/services/settings-service.ts";
import * as schema from "../db/schema.ts";

function createTempRepository() {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-settings-"));
  const sqlitePath = join(dir, "test.sqlite");
  const sqlite = new Database(sqlitePath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });

  return {
    repository: createSettingsRepository(db),
    sqlite,
    cleanup() {
      sqlite.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("设置服务可以按 type/key 保存、读取和覆盖配置", () => {
  const { repository, sqlite, cleanup } = createTempRepository();

  try {
    const first = saveSettingValue(repository, {
      type: "profile",
      key: "basic",
      value: { nickname: "hangge", heightCm: 175 },
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    const second = saveSettingValue(repository, {
      type: "profile",
      key: "basic",
      value: { nickname: "hangge", heightCm: 176 },
      nowIso: "2026-06-26T01:00:00.000Z",
    });
    const loaded = getSettingValue(repository, "profile", "basic");

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(loaded.ok, true);
    assert.deepEqual(loaded.ok ? loaded.data : null, { nickname: "hangge", heightCm: 176 });
    assert.equal(sqlite.prepare("select count(*) as count from settings where type = 'profile' and key = 'basic'").get().count, 1);
  } finally {
    cleanup();
  }
});

test("设置服务会隔离不同 type 和 key", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    saveSettingValue(repository, {
      type: "profile",
      key: "basic",
      value: { heightCm: 175 },
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    saveSettingValue(repository, {
      type: "trend",
      key: "basic",
      value: { minimumDays: 7, minimumRecords: 3 },
      nowIso: "2026-06-26T00:00:00.000Z",
    });

    const profile = getSettingValue(repository, "profile", "basic");
    const trend = getSettingValue(repository, "trend", "basic");

    assert.deepEqual(profile.ok ? profile.data : null, { heightCm: 175 });
    assert.deepEqual(trend.ok ? trend.data : null, { minimumDays: 7, minimumRecords: 3 });
  } finally {
    cleanup();
  }
});
