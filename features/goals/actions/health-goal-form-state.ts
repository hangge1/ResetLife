import type { Goal } from "../../../db/schema.ts";
import type { HealthGoalFieldErrors, HealthGoalFormValues } from "../services/health-goal-input";

export type HealthGoalFormState = {
  values: HealthGoalFormValues;
  fieldErrors: HealthGoalFieldErrors;
  successMessage?: string;
};

export const emptyHealthGoalFormValues: HealthGoalFormValues = {
  targetWeightKg: "",
  targetWaistCm: "",
  targetHipCm: "",
  targetBodyFatPercentage: "",
};

export const initialHealthGoalFormState: HealthGoalFormState = {
  values: emptyHealthGoalFormValues,
  fieldErrors: {},
};

export function healthGoalToFormValues(goal: Goal | null | undefined): HealthGoalFormValues {
  return {
    targetWeightKg: goal?.targetWeightKg == null ? "" : String(goal.targetWeightKg),
    targetWaistCm: goal?.targetWaistCm == null ? "" : String(goal.targetWaistCm),
    targetHipCm: goal?.targetHipCm == null ? "" : String(goal.targetHipCm),
    targetBodyFatPercentage: goal?.targetBodyFatPercentage == null ? "" : String(goal.targetBodyFatPercentage),
  };
}
