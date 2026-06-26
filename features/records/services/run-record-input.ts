import { validateLocalDate } from "./records-service.ts";

export type RunRecordFormValues = {
  distanceKm: string;
  durationMinutes: string;
  paceMinutesPerKm: string;
  averageHeartRateBpm: string;
  averageStrideMeters: string;
  cadenceSpm: string;
};

export type RunRecordEditFormValues = RunRecordFormValues & {
  localDate: string;
};

export type RunRecordFieldErrors = Partial<Record<keyof RunRecordFormValues, string>> & {
  form?: string;
  localDate?: string;
};

export type ParsedRunRecordInput =
  | {
      ok: true;
      data: {
        distanceKm: number;
        durationSeconds?: number;
        paceSecondsPerKm?: number;
        averageHeartRateBpm?: number;
        averageStrideMeters?: number;
        cadenceSpm?: number;
      };
      values: RunRecordFormValues;
    }
  | {
      ok: false;
      fieldErrors: RunRecordFieldErrors;
      values: RunRecordFormValues;
    };

const FIELD_LABELS = {
  distanceKm: "公里数",
  durationMinutes: "运动时长",
  paceMinutesPerKm: "配速",
  averageHeartRateBpm: "平均心率",
  averageStrideMeters: "平均步幅",
  cadenceSpm: "步频",
} as const;

function parseOptionalPositiveNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { empty: true as const };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { empty: false as const, valid: false as const };
  }

  return { empty: false as const, valid: true as const, value: parsed };
}

function setPositiveFieldError(errors: RunRecordFieldErrors, key: keyof RunRecordFormValues) {
  errors[key] = `${FIELD_LABELS[key]}必须是大于 0 的数字`;
}

export function parseRunRecordFormValues(values: RunRecordFormValues): ParsedRunRecordInput {
  const fieldErrors: RunRecordFieldErrors = {};

  const distance = parseOptionalPositiveNumber(values.distanceKm);
  if (distance.empty || !distance.valid) {
    setPositiveFieldError(fieldErrors, "distanceKm");
  }

  const duration = parseOptionalPositiveNumber(values.durationMinutes);
  if (!duration.empty && !duration.valid) {
    setPositiveFieldError(fieldErrors, "durationMinutes");
  }

  const heartRate = parseOptionalPositiveNumber(values.averageHeartRateBpm);
  if (!heartRate.empty && (!heartRate.valid || !Number.isInteger(heartRate.value))) {
    setPositiveFieldError(fieldErrors, "averageHeartRateBpm");
  }

  const stride = parseOptionalPositiveNumber(values.averageStrideMeters);
  if (!stride.empty && !stride.valid) {
    setPositiveFieldError(fieldErrors, "averageStrideMeters");
  }

  const cadence = parseOptionalPositiveNumber(values.cadenceSpm);
  if (!cadence.empty && (!cadence.valid || !Number.isInteger(cadence.value))) {
    setPositiveFieldError(fieldErrors, "cadenceSpm");
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values };
  }

  const distanceKm = !distance.empty && distance.valid ? distance.value : 0;
  const durationValue = !duration.empty && duration.valid ? duration.value : undefined;
  const heartRateValue = !heartRate.empty && heartRate.valid ? heartRate.value : undefined;
  const strideValue = !stride.empty && stride.valid ? stride.value : undefined;
  const cadenceValue = !cadence.empty && cadence.valid ? cadence.value : undefined;

  const durationSeconds = durationValue === undefined ? undefined : Math.round(durationValue * 60);
  const calculatedPaceSeconds =
    durationSeconds === undefined ? undefined : Math.round(durationSeconds / distanceKm);

  return {
    ok: true,
    data: {
      distanceKm,
      ...(durationSeconds === undefined ? {} : { durationSeconds }),
      ...(calculatedPaceSeconds === undefined ? {} : { paceSecondsPerKm: calculatedPaceSeconds }),
      ...(heartRateValue === undefined ? {} : { averageHeartRateBpm: heartRateValue }),
      ...(strideValue === undefined ? {} : { averageStrideMeters: strideValue }),
      ...(cadenceValue === undefined ? {} : { cadenceSpm: cadenceValue }),
    },
    values,
  };
}

export function parseRunRecordEditValues(values: RunRecordEditFormValues) {
  const parsed = parseRunRecordFormValues(values);
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
