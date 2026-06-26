import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createSettingsRepository } from "../features/settings/repositories/settings-repository.ts";
import { parseTrendThresholdFormValues } from "../features/settings/services/trend-threshold-input.ts";
import {
  getTrendThresholdSettings,
  saveTrendThresholdSettings,
} from "../features/settings/services/trend-threshold-settings-service.ts";
import * as schema from "../db/schema.ts";

function createTempRepository() {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-trend-threshold-"));
  const sqlitePath = join(dir, "test.sqlite");
  const sqlite = new Database(sqlitePath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });

  return {
    repository: createSettingsRepository(db),
    cleanup() {
      sqlite.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("趋势估算阈值输入不得低于系统下限", () => {
  const values = { minimumDays: "6", minimumRecords: "2" };
  const parsed = parseTrendThresholdFormValues(values);

  assert.equal(parsed.ok, false);
  assert.deepEqual(parsed.values, values);
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.minimumDays, "最低统计天数不能低于 7 天");
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.minimumRecords, "最低有效记录数不能低于 3 条");
});

test("趋势估算阈值可以保存并读取", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const saved = saveTrendThresholdSettings(repository, {
      minimumDays: 10,
      minimumRecords: 4,
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    const loaded = getTrendThresholdSettings(repository);

    assert.equal(saved.ok, true);
    assert.deepEqual(loaded.ok ? loaded.data : null, {
      minimumDays: 10,
      minimumRecords: 4,
    });
  } finally {
    cleanup();
  }
});

test("趋势估算阈值未配置时使用默认值", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const loaded = getTrendThresholdSettings(repository);

    assert.deepEqual(loaded.ok ? loaded.data : null, {
      minimumDays: 7,
      minimumRecords: 3,
    });
  } finally {
    cleanup();
  }
});
