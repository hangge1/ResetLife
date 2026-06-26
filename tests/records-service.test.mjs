import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createRecordsRepository } from "../features/records/repositories/records-repository.ts";
import {
  createRunRecord,
  saveHealthRecord,
  updateHealthRecord,
  updateRunRecord,
  validateLocalDate,
} from "../features/records/services/records-service.ts";
import * as schema from "../db/schema.ts";

function createTempRepository() {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-records-"));
  const sqlitePath = join(dir, "test.sqlite");
  const sqlite = new Database(sqlitePath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });

  return {
    repository: createRecordsRepository(db),
    sqlite,
    cleanup() {
      sqlite.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("健康记录同日保存会覆盖原记录而不是新增", async () => {
  const { repository, sqlite, cleanup } = createTempRepository();

  try {
    const first = saveHealthRecord(repository, {
      localDate: "2026-06-26",
      weightKg: 82.4,
      waistCm: 91.2,
      hipCm: 101.5,
      bodyFatPercentage: 24.6,
      nowIso: "2026-06-26T08:00:00.000Z",
    });
    assert.equal(first.ok, true);

    const second = saveHealthRecord(repository, {
      localDate: "2026-06-26",
      weightKg: 81.9,
      waistCm: 90.5,
      hipCm: 101.0,
      bodyFatPercentage: 24.1,
      nowIso: "2026-06-26T21:00:00.000Z",
    });
    assert.equal(second.ok, true);

    const count = sqlite.prepare("select count(*) as count from health_records").get().count;
    assert.equal(count, 1);
    assert.equal(first.ok && second.ok ? first.data.id : "", second.ok ? second.data.id : "");
    assert.equal(second.ok ? second.data.weightKg : 0, 81.9);
    assert.equal(second.ok ? second.data.updatedAtIso : "", "2026-06-26T21:00:00.000Z");
  } finally {
    cleanup();
  }
});

test("跑步记录同日可以创建多条并按日期读取", async () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const morning = createRunRecord(repository, {
      localDate: "2026-06-26",
      distanceKm: 5.2,
      durationSeconds: 1800,
      paceSecondsPerKm: 346,
      averageHeartRateBpm: 142,
      averageStrideMeters: 1.08,
      cadenceSpm: 166,
      nowIso: "2026-06-26T07:00:00.000Z",
    });
    const evening = createRunRecord(repository, {
      localDate: "2026-06-26",
      distanceKm: 3.1,
      durationSeconds: 1200,
      paceSecondsPerKm: 387,
      averageHeartRateBpm: 135,
      averageStrideMeters: 1.02,
      cadenceSpm: 162,
      nowIso: "2026-06-26T19:00:00.000Z",
    });

    assert.equal(morning.ok, true);
    assert.equal(evening.ok, true);
    assert.notEqual(morning.ok ? morning.data.id : "", evening.ok ? evening.data.id : "");

    const byDate = repository.listRunRecordsByDate("2026-06-26");
    assert.equal(byDate.ok, true);
    assert.equal(byDate.ok ? byDate.data.length : 0, 2);
    assert.deepEqual(
      byDate.ok ? byDate.data.map((record) => record.distanceKm) : [],
      [3.1, 5.2],
    );
  } finally {
    cleanup();
  }
});

test("记录 repository 支持基础读取、更新和删除", async () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const health = saveHealthRecord(repository, {
      localDate: "2026-06-25",
      weightKg: 82,
      nowIso: "2026-06-25T08:00:00.000Z",
    });
    assert.equal(health.ok, true);

    const healthByDate = repository.getHealthRecordByDate("2026-06-25");
    assert.equal(healthByDate.ok, true);
    assert.equal(healthByDate.ok && healthByDate.data ? healthByDate.data.weightKg : 0, 82);

    const updatedHealth = repository.updateHealthRecord(health.ok ? health.data.id : "", {
      weightKg: 81.5,
      updatedAtIso: "2026-06-25T22:00:00.000Z",
    });
    assert.equal(updatedHealth.ok, true);
    assert.equal(updatedHealth.ok && updatedHealth.data ? updatedHealth.data.weightKg : 0, 81.5);

    const run = createRunRecord(repository, {
      localDate: "2026-06-25",
      distanceKm: 4,
      durationSeconds: 1500,
      nowIso: "2026-06-25T19:00:00.000Z",
    });
    assert.equal(run.ok, true);

    const updatedRun = updateRunRecord(repository, run.ok ? run.data.id : "", {
      distanceKm: 4.5,
      durationSeconds: 1600,
      nowIso: "2026-06-25T20:00:00.000Z",
    });
    assert.equal(updatedRun.ok, true);
    assert.equal(updatedRun.ok && updatedRun.data ? updatedRun.data.distanceKm : 0, 4.5);

    assert.equal(repository.deleteRunRecord(run.ok ? run.data.id : "").ok, true);
    assert.equal(repository.getRunRecordById(run.ok ? run.data.id : "").ok, true);
    assert.equal(repository.getRunRecordById(run.ok ? run.data.id : "").data, null);

    assert.equal(repository.deleteHealthRecord(health.ok ? health.data.id : "").ok, true);
    assert.equal(repository.getHealthRecordByDate("2026-06-25").ok, true);
    assert.equal(repository.getHealthRecordByDate("2026-06-25").data, null);
  } finally {
    cleanup();
  }
});

test("服务层校验本地日期格式", () => {
  assert.equal(validateLocalDate("2026-06-26").ok, true);
  assert.equal(validateLocalDate("2026-6-26").ok, false);
  assert.equal(validateLocalDate("2026-13-01").ok, false);
  assert.equal(validateLocalDate("2026-02-30").ok, false);
});

test("服务层更新入口也会校验本地日期格式", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const health = saveHealthRecord(repository, {
      localDate: "2026-06-26",
      weightKg: 82,
      nowIso: "2026-06-26T08:00:00.000Z",
    });
    assert.equal(health.ok, true);

    const invalidHealthUpdate = updateHealthRecord(repository, health.ok ? health.data.id : "", {
      localDate: "2026-02-30",
      nowIso: "2026-06-26T09:00:00.000Z",
    });
    assert.equal(invalidHealthUpdate.ok, false);
    assert.equal(invalidHealthUpdate.ok ? "" : invalidHealthUpdate.fieldErrors.localDate, "日期必须是有效的 YYYY-MM-DD");

    const run = createRunRecord(repository, {
      localDate: "2026-06-26",
      distanceKm: 5,
      nowIso: "2026-06-26T19:00:00.000Z",
    });
    assert.equal(run.ok, true);

    const invalidRunUpdate = updateRunRecord(repository, run.ok ? run.data.id : "", {
      localDate: "2026-2-26",
      nowIso: "2026-06-26T20:00:00.000Z",
    });
    assert.equal(invalidRunUpdate.ok, false);
    assert.equal(invalidRunUpdate.ok ? "" : invalidRunUpdate.fieldErrors.localDate, "日期必须是有效的 YYYY-MM-DD");
  } finally {
    cleanup();
  }
});

test("repository 数据库错误返回中文通用错误", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const result = repository.createRunRecord({
      localDate: "2026-06-26",
      distanceKm: null,
      nowIso: "2026-06-26T08:00:00.000Z",
    });
    assert.equal(result.ok, false);
    assert.equal(result.ok ? "" : result.error.message, "记录数据操作失败");
    assert.doesNotMatch(result.ok ? "" : result.error.message, /SQLite|Drizzle|constraint|NOT NULL/i);
  } finally {
    cleanup();
  }
});
