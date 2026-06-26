import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createRecordsRepository } from "../features/records/repositories/records-repository.ts";
import { listHistoryRecords } from "../features/records/services/history-service.ts";
import { createRunRecord, saveHealthRecord } from "../features/records/services/records-service.ts";
import * as schema from "../db/schema.ts";

function createTempRepository() {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-history-"));
  const sqlitePath = join(dir, "test.sqlite");
  const sqlite = new Database(sqlitePath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });

  return {
    repository: createRecordsRepository(db),
    cleanup() {
      sqlite.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

function seedHistory(repository) {
  saveHealthRecord(repository, {
    localDate: "2026-06-26",
    weightKg: 81.9,
    waistCm: 90.5,
    nowIso: "2026-06-26T08:00:00.000Z",
  });
  createRunRecord(repository, {
    localDate: "2026-06-26",
    distanceKm: 5,
    durationSeconds: 1800,
    paceSecondsPerKm: 360,
    nowIso: "2026-06-26T19:00:00.000Z",
  });
  createRunRecord(repository, {
    localDate: "2026-06-20",
    distanceKm: 3,
    nowIso: "2026-06-20T19:00:00.000Z",
  });
  saveHealthRecord(repository, {
    localDate: "2026-05-01",
    weightKg: 84,
    nowIso: "2026-05-01T08:00:00.000Z",
  });
}

test("历史记录聚合健康和跑步记录并按日期倒序", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    seedHistory(repository);
    const result = listHistoryRecords(repository, { type: "all", range: "all", todayLocalDate: "2026-06-26" });

    assert.equal(result.ok, true);
    assert.deepEqual(result.ok ? result.data.map((entry) => entry.kind) : [], ["run", "health", "run", "health"]);
    assert.deepEqual(result.ok ? result.data.map((entry) => entry.localDate) : [], [
      "2026-06-26",
      "2026-06-26",
      "2026-06-20",
      "2026-05-01",
    ]);
  } finally {
    cleanup();
  }
});

test("历史记录支持类型筛选", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    seedHistory(repository);
    const result = listHistoryRecords(repository, { type: "run", range: "all", todayLocalDate: "2026-06-26" });

    assert.equal(result.ok, true);
    assert.deepEqual(result.ok ? result.data.map((entry) => entry.kind) : [], ["run", "run"]);
  } finally {
    cleanup();
  }
});

test("历史记录支持最近 7 天和自定义日期范围筛选", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    seedHistory(repository);
    const recent = listHistoryRecords(repository, { type: "all", range: "last7", todayLocalDate: "2026-06-26" });
    assert.equal(recent.ok, true);
    assert.deepEqual(recent.ok ? recent.data.map((entry) => entry.localDate) : [], [
      "2026-06-26",
      "2026-06-26",
      "2026-06-20",
    ]);

    const custom = listHistoryRecords(repository, {
      type: "all",
      range: "custom",
      startDate: "2026-06-21",
      endDate: "2026-06-26",
      todayLocalDate: "2026-06-26",
    });
    assert.equal(custom.ok, true);
    assert.deepEqual(custom.ok ? custom.data.map((entry) => entry.localDate) : [], ["2026-06-26", "2026-06-26"]);
  } finally {
    cleanup();
  }
});
