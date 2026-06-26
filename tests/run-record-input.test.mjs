import assert from "node:assert/strict";
import { test } from "node:test";

import { parseRunRecordFormValues } from "../features/records/services/run-record-input.ts";

test("跑步记录表单会转换为内部单位并自动计算配速", () => {
  const result = parseRunRecordFormValues({
    distanceKm: "5",
    durationMinutes: "30",
    paceMinutesPerKm: "",
    averageHeartRateBpm: "142",
    averageStrideMeters: "1.08",
    cadenceSpm: "166",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.data : {}, {
    distanceKm: 5,
    durationSeconds: 1800,
    paceSecondsPerKm: 360,
    averageHeartRateBpm: 142,
    averageStrideMeters: 1.08,
    cadenceSpm: 166,
  });
});

test("跑步配速由时长和公里数计算，忽略手动配速输入", () => {
  const result = parseRunRecordFormValues({
    distanceKm: "5",
    durationMinutes: "30",
    paceMinutesPerKm: "5.5",
    averageHeartRateBpm: "",
    averageStrideMeters: "",
    cadenceSpm: "",
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.data.paceSecondsPerKm : 0, 360);
});

test("跑步记录表单非法输入会返回中文字段错误并保留输入", () => {
  const result = parseRunRecordFormValues({
    distanceKm: "",
    durationMinutes: "-1",
    paceMinutesPerKm: "abc",
    averageHeartRateBpm: "0",
    averageStrideMeters: "-2",
    cadenceSpm: "xyz",
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok ? "" : result.fieldErrors.distanceKm, "公里数必须是大于 0 的数字");
  assert.equal(result.ok ? "" : result.fieldErrors.durationMinutes, "运动时长必须是大于 0 的数字");
  assert.equal(result.ok ? "" : result.fieldErrors.paceMinutesPerKm, undefined);
  assert.equal(result.ok ? "" : result.fieldErrors.averageHeartRateBpm, "平均心率必须是大于 0 的数字");
  assert.equal(result.ok ? "" : result.fieldErrors.averageStrideMeters, "平均步幅必须是大于 0 的数字");
  assert.equal(result.ok ? "" : result.fieldErrors.cadenceSpm, "步频必须是大于 0 的数字");
  assert.equal(result.ok ? "" : result.values.paceMinutesPerKm, "abc");
});
