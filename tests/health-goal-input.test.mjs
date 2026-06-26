import assert from "node:assert/strict";
import { test } from "node:test";

import { parseHealthGoalFormValues } from "../features/goals/services/health-goal-input.ts";

test("健康目标输入解析会保留可选空值而不是转成 0", () => {
  const parsed = parseHealthGoalFormValues({
    targetWeightKg: "72.5",
    targetWaistCm: "",
    targetHipCm: " ",
    targetBodyFatPercentage: "",
  });

  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.values, {
    targetWeightKg: "72.5",
    targetWaistCm: "",
    targetHipCm: " ",
    targetBodyFatPercentage: "",
  });
  assert.deepEqual(
    parsed.ok ? parsed.data : {},
    {
      targetWeightKg: 72.5,
      targetWaistCm: null,
      targetHipCm: null,
      targetBodyFatPercentage: null,
    },
  );
});

test("健康目标输入解析会返回字段级中文错误并保留原始输入", () => {
  const values = {
    targetWeightKg: "0",
    targetWaistCm: "-3",
    targetHipCm: "abc",
    targetBodyFatPercentage: "101",
  };
  const parsed = parseHealthGoalFormValues(values);

  assert.equal(parsed.ok, false);
  assert.deepEqual(parsed.values, values);
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.targetWeightKg, "目标体重必须是大于 0 的数字");
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.targetWaistCm, "目标腰围必须是大于 0 的数字");
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.targetHipCm, "目标臀围必须是大于 0 的数字");
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.targetBodyFatPercentage, "目标体脂率必须是 0 到 100 之间的数字");
});

test("健康目标输入解析要求目标体重必填", () => {
  const parsed = parseHealthGoalFormValues({
    targetWeightKg: "",
    targetWaistCm: "82",
    targetHipCm: "",
    targetBodyFatPercentage: "",
  });

  assert.equal(parsed.ok, false);
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.targetWeightKg, "请填写目标体重");
});
