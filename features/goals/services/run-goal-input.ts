export type RunGoalFormValues = {
  weeklyRunCount: string;
  weeklyDistanceKm: string;
};

export type RunGoalFieldErrors = Partial<Record<keyof RunGoalFormValues, string>> & {
  form?: string;
};

export type ParsedRunGoalInput =
  | {
      ok: true;
      data: {
        weeklyRunCount: number;
        weeklyDistanceKm: number;
      };
      values: RunGoalFormValues;
    }
  | {
      ok: false;
      fieldErrors: RunGoalFieldErrors;
      values: RunGoalFormValues;
    };

function parseNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { empty: true as const };
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    return { empty: false as const, valid: false as const };
  }

  return { empty: false as const, valid: true as const, value: parsed };
}

export function parseRunGoalFormValues(values: RunGoalFormValues): ParsedRunGoalInput {
  const fieldErrors: RunGoalFieldErrors = {};
  const weeklyRunCount = parseNumber(values.weeklyRunCount);
  const weeklyDistanceKm = parseNumber(values.weeklyDistanceKm);
  let parsedWeeklyRunCount: number | null = null;
  let parsedWeeklyDistanceKm: number | null = null;

  if (weeklyRunCount.empty) {
    fieldErrors.weeklyRunCount = "请填写每周跑步次数";
  } else if (!weeklyRunCount.valid || !Number.isInteger(weeklyRunCount.value) || weeklyRunCount.value <= 0) {
    fieldErrors.weeklyRunCount = "每周跑步次数必须是大于 0 的整数";
  } else {
    parsedWeeklyRunCount = weeklyRunCount.value;
  }

  if (weeklyDistanceKm.empty) {
    fieldErrors.weeklyDistanceKm = "请填写每周跑量";
  } else if (!weeklyDistanceKm.valid || weeklyDistanceKm.value <= 0) {
    fieldErrors.weeklyDistanceKm = "每周跑量必须是大于 0 的数字";
  } else {
    parsedWeeklyDistanceKm = weeklyDistanceKm.value;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values };
  }

  if (parsedWeeklyRunCount == null || parsedWeeklyDistanceKm == null) {
    return { ok: false, fieldErrors: { form: "跑步目标输入无效" }, values };
  }

  return {
    ok: true,
    data: {
      weeklyRunCount: parsedWeeklyRunCount,
      weeklyDistanceKm: parsedWeeklyDistanceKm,
    },
    values,
  };
}
