import type { HealthRecordFormValues, HealthRecordFieldErrors } from "../services/health-record-input";
import type { HealthRecord } from "../../../db/schema.ts";

export type HealthRecordFormState = {
  values: HealthRecordFormValues;
  fieldErrors: HealthRecordFieldErrors;
  successMessage?: string;
};

export const emptyHealthRecordFormValues: HealthRecordFormValues = {
  weightKg: "",
  waistCm: "",
  hipCm: "",
  bodyFatPercentage: "",
};

export const initialHealthRecordFormState: HealthRecordFormState = {
  values: emptyHealthRecordFormValues,
  fieldErrors: {},
};

export function healthRecordToFormValues(record: HealthRecord | null | undefined): HealthRecordFormValues {
  return {
    weightKg: record?.weightKg == null ? "" : String(record.weightKg),
    waistCm: record?.waistCm == null ? "" : String(record.waistCm),
    hipCm: record?.hipCm == null ? "" : String(record.hipCm),
    bodyFatPercentage: record?.bodyFatPercentage == null ? "" : String(record.bodyFatPercentage),
  };
}
