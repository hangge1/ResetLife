import assert from "node:assert/strict";
import { test } from "node:test";

import { parseRunGoalFormValues } from "../features/goals/services/run-goal-input.ts";

test("跑步目标输入解析会转换每周次数和跑量", () => {
  const parsed = parseRunGoalFormValues({
    weeklyRunCount: "3",
    weeklyDistanceKm: "18.5",
  });

  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.values, {
    weeklyRunCount: "3",
    weeklyDistanceKm: "18.5",
  });
  assert.deepEqual(
    parsed.ok ? parsed.data : {},
    {
      weeklyRunCount: 3,
      weeklyDistanceKm: 18.5,
    },
  );
});

test("跑步目标输入解析会返回字段级中文错误并保留原始输入", () => {
  const values = {
    weeklyRunCount: "2.5",
    weeklyDistanceKm: "0",
  };
  const parsed = parseRunGoalFormValues(values);

  assert.equal(parsed.ok, false);
  assert.deepEqual(parsed.values, values);
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.weeklyRunCount, "每周跑步次数必须是大于 0 的整数");
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.weeklyDistanceKm, "每周跑量必须是大于 0 的数字");
});

test("跑步目标输入解析要求两个字段都必填", () => {
  const parsed = parseRunGoalFormValues({
    weeklyRunCount: "",
    weeklyDistanceKm: " ",
  });

  assert.equal(parsed.ok, false);
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.weeklyRunCount, "请填写每周跑步次数");
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.weeklyDistanceKm, "请填写每周跑量");
});
