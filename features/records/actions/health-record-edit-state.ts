import type { HealthRecord } from "../../../db/schema.ts";
import type { HealthRecordEditFormValues, HealthRecordFieldErrors } from "../services/health-record-input";

export type HealthRecordEditFormState = {
  values: HealthRecordEditFormValues;
  fieldErrors: HealthRecordFieldErrors;
  successMessage?: string;
};

export function healthRecordToEditValues(record: HealthRecord): HealthRecordEditFormValues {
  return {
    localDate: record.localDate,
    weightKg: record.weightKg == null ? "" : String(record.weightKg),
    waistCm: record.waistCm == null ? "" : String(record.waistCm),
    hipCm: record.hipCm == null ? "" : String(record.hipCm),
    bodyFatPercentage: record.bodyFatPercentage == null ? "" : String(record.bodyFatPercentage),
  };
}
