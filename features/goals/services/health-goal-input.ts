export type HealthGoalFormValues = {
  targetWeightKg: string;
  targetWaistCm: string;
  targetHipCm: string;
  targetBodyFatPercentage: string;
};

export type HealthGoalFieldErrors = Partial<Record<keyof HealthGoalFormValues, string>> & {
  form?: string;
};

export type ParsedHealthGoalInput =
  | {
      ok: true;
      data: {
        targetWeightKg: number;
        targetWaistCm: number | null;
        targetHipCm: number | null;
        targetBodyFatPercentage: number | null;
      };
      values: HealthGoalFormValues;
    }
  | {
      ok: false;
      fieldErrors: HealthGoalFieldErrors;
      values: HealthGoalFormValues;
    };

const FIELD_RULES = {
  targetWeightKg: {
    label: "目标体重",
    requiredMessage: "请填写目标体重",
    minExclusive: 0,
    maxInclusive: null,
  },
  targetWaistCm: {
    label: "目标腰围",
    requiredMessage: null,
    minExclusive: 0,
    maxInclusive: null,
  },
  targetHipCm: {
    label: "目标臀围",
    requiredMessage: null,
    minExclusive: 0,
    maxInclusive: null,
  },
  targetBodyFatPercentage: {
    label: "目标体脂率",
    requiredMessage: null,
    minExclusive: null,
    maxInclusive: 100,
  },
} as const;

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

function numberErrorFor(key: keyof HealthGoalFormValues) {
  if (key === "targetBodyFatPercentage") {
    return "目标体脂率必须是 0 到 100 之间的数字";
  }

  return `${FIELD_RULES[key].label}必须是大于 0 的数字`;
}

export function parseHealthGoalFormValues(values: HealthGoalFormValues): ParsedHealthGoalInput {
  const fieldErrors: HealthGoalFieldErrors = {};
  const data: Extract<ParsedHealthGoalInput, { ok: true }>["data"] = {
    targetWeightKg: 0,
    targetWaistCm: null,
    targetHipCm: null,
    targetBodyFatPercentage: null,
  };

  for (const key of Object.keys(FIELD_RULES) as Array<keyof typeof FIELD_RULES>) {
    const rule = FIELD_RULES[key];
    const parsed = parseNumber(values[key]);

    if (parsed.empty) {
      if (rule.requiredMessage) {
        fieldErrors[key] = rule.requiredMessage;
      }
      continue;
    }

    if (!parsed.valid) {
      fieldErrors[key] = numberErrorFor(key);
      continue;
    }

    if (rule.minExclusive !== null && parsed.value <= rule.minExclusive) {
      fieldErrors[key] = numberErrorFor(key);
      continue;
    }

    if (rule.maxInclusive !== null && (parsed.value < 0 || parsed.value > rule.maxInclusive)) {
      fieldErrors[key] = numberErrorFor(key);
      continue;
    }

    data[key] = parsed.value;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values };
  }

  return { ok: true, data, values };
}
