export type TrendThresholdFormValues = {
  minimumDays: string;
  minimumRecords: string;
};

export type TrendThresholdFieldErrors = Partial<Record<keyof TrendThresholdFormValues, string>> & {
  form?: string;
};

export type ParsedTrendThresholdInput =
  | {
      ok: true;
      data: {
        minimumDays: number;
        minimumRecords: number;
      };
      values: TrendThresholdFormValues;
    }
  | {
      ok: false;
      fieldErrors: TrendThresholdFieldErrors;
      values: TrendThresholdFormValues;
    };

function parseInteger(value: string) {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function parseTrendThresholdFormValues(values: TrendThresholdFormValues): ParsedTrendThresholdInput {
  const fieldErrors: TrendThresholdFieldErrors = {};
  const minimumDays = parseInteger(values.minimumDays);
  const minimumRecords = parseInteger(values.minimumRecords);
  let parsedMinimumDays: number | null = null;
  let parsedMinimumRecords: number | null = null;

  if (minimumDays == null || minimumDays < 7) {
    fieldErrors.minimumDays = "最低统计天数不能低于 7 天";
  } else {
    parsedMinimumDays = minimumDays;
  }

  if (minimumRecords == null || minimumRecords < 3) {
    fieldErrors.minimumRecords = "最低有效记录数不能低于 3 条";
  } else {
    parsedMinimumRecords = minimumRecords;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values };
  }

  if (parsedMinimumDays == null || parsedMinimumRecords == null) {
    return { ok: false, fieldErrors: { form: "趋势估算配置无效" }, values };
  }

  return {
    ok: true,
    data: { minimumDays: parsedMinimumDays, minimumRecords: parsedMinimumRecords },
    values,
  };
}
