import { validateLocalDate } from "./records-service.ts";

export type HealthRecordFormValues = {
  weightKg: string;
  waistCm: string;
  hipCm: string;
  bodyFatPercentage: string;
};

export type HealthRecordEditFormValues = HealthRecordFormValues & {
  localDate: string;
};

export type HealthRecordFieldErrors = Partial<Record<keyof HealthRecordFormValues, string>> & {
  form?: string;
  localDate?: string;
};

export type ParsedHealthRecordInput =
  | {
      ok: true;
      data: {
        weightKg?: number;
        waistCm?: number;
        hipCm?: number;
        bodyFatPercentage?: number;
      };
      values: HealthRecordFormValues;
    }
  | {
      ok: false;
      fieldErrors: HealthRecordFieldErrors;
      values: HealthRecordFormValues;
    };

const FIELD_RULES = {
  weightKg: { label: "体重", minExclusive: 0, maxInclusive: null },
  waistCm: { label: "腰围", minExclusive: 0, maxInclusive: null },
  hipCm: { label: "臀围", minExclusive: 0, maxInclusive: null },
  bodyFatPercentage: { label: "体脂率", minExclusive: null, maxInclusive: 100 },
} as const;

function parsePositiveNumber(value: string) {
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

export function parseHealthRecordFormValues(values: HealthRecordFormValues): ParsedHealthRecordInput {
  const fieldErrors: HealthRecordFieldErrors = {};
  const data: Extract<ParsedHealthRecordInput, { ok: true }>["data"] = {};
  let filledCount = 0;

  for (const key of Object.keys(FIELD_RULES) as Array<keyof typeof FIELD_RULES>) {
    const rule = FIELD_RULES[key];
    const parsed = parsePositiveNumber(values[key]);

    if (parsed.empty) {
      continue;
    }

    filledCount += 1;

    if (!parsed.valid) {
      fieldErrors[key] =
        key === "bodyFatPercentage"
          ? "体脂率必须是 0 到 100 之间的数字"
          : `${rule.label}必须是大于 0 的数字`;
      continue;
    }

    if (rule.minExclusive !== null && parsed.value <= rule.minExclusive) {
      fieldErrors[key] = `${rule.label}必须是大于 0 的数字`;
      continue;
    }

    if (rule.maxInclusive !== null && (parsed.value < 0 || parsed.value > rule.maxInclusive)) {
      fieldErrors[key] = "体脂率必须是 0 到 100 之间的数字";
      continue;
    }

    data[key] = parsed.value;
  }

  if (filledCount === 0) {
    fieldErrors.form = "请至少填写一项健康数据";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values };
  }

  return { ok: true, data, values };
}

export function parseHealthRecordEditValues(values: HealthRecordEditFormValues) {
  const parsed = parseHealthRecordFormValues(values);
  const dateValidation = validateLocalDate(values.localDate);

  if (parsed.ok && dateValidation.ok) {
    return {
      ok: true as const,
      data: {
        localDate: values.localDate,
        ...parsed.data,
      },
      values,
    };
  }

  return {
    ok: false as const,
    fieldErrors: {
      ...(parsed.ok ? {} : parsed.fieldErrors),
      ...(dateValidation.ok ? {} : dateValidation.fieldErrors),
    },
    values,
  };
}
