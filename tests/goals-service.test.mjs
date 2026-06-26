import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createGoalsRepository } from "../features/goals/repositories/goals-repository.ts";
import { saveHealthGoal, saveRunGoal } from "../features/goals/services/goals-service.ts";
import * as schema from "../db/schema.ts";

function createTempRepository() {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-goals-"));
  const sqlitePath = join(dir, "test.sqlite");
  const sqlite = new Database(sqlitePath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });

  return {
    repository: createGoalsRepository(db),
    sqlite,
    cleanup() {
      sqlite.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("健康目标保存会按类型覆盖原目标", () => {
  const { repository, sqlite, cleanup } = createTempRepository();

  try {
    const first = saveHealthGoal(repository, {
      targetWeightKg: 75,
      targetWaistCm: 84,
      targetHipCm: null,
      targetBodyFatPercentage: 18,
      nowIso: "2026-06-26T08:00:00.000Z",
    });
    assert.equal(first.ok, true);

    const second = saveHealthGoal(repository, {
      targetWeightKg: 73,
      targetWaistCm: 82,
      targetHipCm: 96,
      targetBodyFatPercentage: 17,
      nowIso: "2026-06-26T09:00:00.000Z",
    });
    assert.equal(second.ok, true);

    assert.equal(sqlite.prepare("select count(*) as count from goals where type = 'health'").get().count, 1);
    assert.equal(first.ok && second.ok ? first.data.id : "", second.ok ? second.data.id : "");
    assert.equal(second.ok ? second.data.targetWeightKg : 0, 73);
  } finally {
    cleanup();
  }
});

test("跑步目标保存会按类型覆盖原目标", () => {
  const { repository, sqlite, cleanup } = createTempRepository();

  try {
    const first = saveRunGoal(repository, {
      weeklyRunCount: 3,
      weeklyDistanceKm: 15,
      nowIso: "2026-06-26T08:00:00.000Z",
    });
    const second = saveRunGoal(repository, {
      weeklyRunCount: 4,
      weeklyDistanceKm: 22,
      nowIso: "2026-06-26T09:00:00.000Z",
    });

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(sqlite.prepare("select count(*) as count from goals where type = 'run'").get().count, 1);
    assert.equal(first.ok && second.ok ? first.data.id : "", second.ok ? second.data.id : "");
    assert.equal(second.ok ? second.data.weeklyRunCount : 0, 4);
    assert.equal(second.ok ? second.data.weeklyDistanceKm : 0, 22);
  } finally {
    cleanup();
  }
});

test("目标服务校验非法数值", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const health = saveHealthGoal(repository, {
      targetWeightKg: 0,
      targetWaistCm: -1,
      targetHipCm: null,
      targetBodyFatPercentage: 101,
      nowIso: "2026-06-26T08:00:00.000Z",
    });
    assert.equal(health.ok, false);
    assert.equal(health.ok ? "" : health.fieldErrors.targetWeightKg, "目标体重必须是大于 0 的数字");
    assert.equal(health.ok ? "" : health.fieldErrors.targetWaistCm, "目标腰围必须是大于 0 的数字");
    assert.equal(health.ok ? "" : health.fieldErrors.targetBodyFatPercentage, "目标体脂率必须是 0 到 100 之间的数字");

    const run = saveRunGoal(repository, {
      weeklyRunCount: 0,
      weeklyDistanceKm: -5,
      nowIso: "2026-06-26T08:00:00.000Z",
    });
    assert.equal(run.ok, false);
    assert.equal(run.ok ? "" : run.fieldErrors.weeklyRunCount, "每周跑步次数必须是大于 0 的整数");
    assert.equal(run.ok ? "" : run.fieldErrors.weeklyDistanceKm, "每周跑量必须是大于 0 的数字");
  } finally {
    cleanup();
  }
});
