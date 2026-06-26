import assert from "node:assert/strict";
import { test } from "node:test";

import { parseHealthRecordFormValues } from "../features/records/services/health-record-input.ts";

test("健康记录表单输入会转换为内部单位数值", () => {
  const result = parseHealthRecordFormValues({
    weightKg: "82.4",
    waistCm: "91.2",
    hipCm: "101.5",
    bodyFatPercentage: "24.6",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.data : {}, {
    weightKg: 82.4,
    waistCm: 91.2,
    hipCm: 101.5,
    bodyFatPercentage: 24.6,
  });
});

test("健康记录表单空输入会返回中文表单错误并保留输入", () => {
  const result = parseHealthRecordFormValues({
    weightKg: "",
    waistCm: " ",
    hipCm: "",
    bodyFatPercentage: "",
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok ? "" : result.fieldErrors.form, "请至少填写一项健康数据");
  assert.deepEqual(result.ok ? {} : result.values, {
    weightKg: "",
    waistCm: " ",
    hipCm: "",
    bodyFatPercentage: "",
  });
});

test("健康记录表单非法数值会返回字段错误并保留输入", () => {
  const result = parseHealthRecordFormValues({
    weightKg: "-1",
    waistCm: "abc",
    hipCm: "0",
    bodyFatPercentage: "120",
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok ? "" : result.fieldErrors.weightKg, "体重必须是大于 0 的数字");
  assert.equal(result.ok ? "" : result.fieldErrors.waistCm, "腰围必须是大于 0 的数字");
  assert.equal(result.ok ? "" : result.fieldErrors.hipCm, "臀围必须是大于 0 的数字");
  assert.equal(result.ok ? "" : result.fieldErrors.bodyFatPercentage, "体脂率必须是 0 到 100 之间的数字");
  assert.equal(result.ok ? "" : result.values.waistCm, "abc");
});
