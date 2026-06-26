import type { RunRecord } from "../../../db/schema.ts";
import type { RunRecordEditFormValues, RunRecordFieldErrors } from "../services/run-record-input";

export type RunRecordEditFormState = {
  values: RunRecordEditFormValues;
  fieldErrors: RunRecordFieldErrors;
  successMessage?: string;
};

function secondsToMinutesText(seconds: number | null) {
  return seconds == null ? "" : String(Math.round((seconds / 60) * 10) / 10);
}

export function runRecordToEditValues(record: RunRecord): RunRecordEditFormValues {
  return {
    localDate: record.localDate,
    distanceKm: String(record.distanceKm),
    durationMinutes: secondsToMinutesText(record.durationSeconds),
    paceMinutesPerKm: secondsToMinutesText(record.paceSecondsPerKm),
    averageHeartRateBpm: record.averageHeartRateBpm == null ? "" : String(record.averageHeartRateBpm),
    averageStrideMeters: record.averageStrideMeters == null ? "" : String(record.averageStrideMeters),
    cadenceSpm: record.cadenceSpm == null ? "" : String(record.cadenceSpm),
  };
}
