import type { TrendThresholdSettings } from "../services/trend-threshold-settings-service";
import type { TrendThresholdFieldErrors, TrendThresholdFormValues } from "../services/trend-threshold-input";

export type TrendThresholdFormState = {
  values: TrendThresholdFormValues;
  fieldErrors: TrendThresholdFieldErrors;
  successMessage?: string;
};

export const initialTrendThresholdFormState: TrendThresholdFormState = {
  values: {
    minimumDays: "7",
    minimumRecords: "3",
  },
  fieldErrors: {},
};

export function trendThresholdToFormValues(settings: TrendThresholdSettings): TrendThresholdFormValues {
  return {
    minimumDays: String(settings.minimumDays),
    minimumRecords: String(settings.minimumRecords),
  };
}
