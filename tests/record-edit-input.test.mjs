import assert from "node:assert/strict";
import { test } from "node:test";

import { parseHealthRecordEditValues } from "../features/records/services/health-record-input.ts";
import { parseRunRecordEditValues } from "../features/records/services/run-record-input.ts";

test("健康记录编辑输入包含有效日期和健康数据", () => {
  const result = parseHealthRecordEditValues({
    localDate: "2026-06-26",
    weightKg: "81.5",
    waistCm: "90",
    hipCm: "",
    bodyFatPercentage: "",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.data : {}, {
    localDate: "2026-06-26",
    weightKg: 81.5,
    waistCm: 90,
  });
});

test("跑步记录编辑输入包含有效日期和跑步数据", () => {
  const result = parseRunRecordEditValues({
    localDate: "2026-06-26",
    distanceKm: "5",
    durationMinutes: "30",
    paceMinutesPerKm: "",
    averageHeartRateBpm: "",
    averageStrideMeters: "",
    cadenceSpm: "",
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.data.localDate : "", "2026-06-26");
  assert.equal(result.ok ? result.data.paceSecondsPerKm : 0, 360);
});

test("编辑输入会校验日期并保留原始输入", () => {
  const health = parseHealthRecordEditValues({
    localDate: "2026-02-30",
    weightKg: "81.5",
    waistCm: "",
    hipCm: "",
    bodyFatPercentage: "",
  });
  assert.equal(health.ok, false);
  assert.equal(health.ok ? "" : health.fieldErrors.localDate, "日期必须是有效的 YYYY-MM-DD");
  assert.equal(health.ok ? "" : health.values.weightKg, "81.5");

  const run = parseRunRecordEditValues({
    localDate: "2026-2-26",
    distanceKm: "5",
    durationMinutes: "",
    paceMinutesPerKm: "",
    averageHeartRateBpm: "",
    averageStrideMeters: "",
    cadenceSpm: "",
  });
  assert.equal(run.ok, false);
  assert.equal(run.ok ? "" : run.fieldErrors.localDate, "日期必须是有效的 YYYY-MM-DD");
  assert.equal(run.ok ? "" : run.values.distanceKm, "5");
});
