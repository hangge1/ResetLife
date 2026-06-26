import type { RunRecordFieldErrors, RunRecordFormValues } from "../services/run-record-input";

export type RunRecordFormState = {
  values: RunRecordFormValues;
  fieldErrors: RunRecordFieldErrors;
  successMessage?: string;
};

export const emptyRunRecordFormValues: RunRecordFormValues = {
  distanceKm: "",
  durationMinutes: "",
  paceMinutesPerKm: "",
  averageHeartRateBpm: "",
  averageStrideMeters: "",
  cadenceSpm: "",
};

export const initialRunRecordFormState: RunRecordFormState = {
  values: emptyRunRecordFormValues,
  fieldErrors: {},
};
