import type { Goal } from "../../../db/schema.ts";
import type { RunGoalFieldErrors, RunGoalFormValues } from "../services/run-goal-input";

export type RunGoalFormState = {
  values: RunGoalFormValues;
  fieldErrors: RunGoalFieldErrors;
  successMessage?: string;
};

export const emptyRunGoalFormValues: RunGoalFormValues = {
  weeklyRunCount: "",
  weeklyDistanceKm: "",
};

export const initialRunGoalFormState: RunGoalFormState = {
  values: emptyRunGoalFormValues,
  fieldErrors: {},
};

export function runGoalToFormValues(goal: Goal | null | undefined): RunGoalFormValues {
  return {
    weeklyRunCount: goal?.weeklyRunCount == null ? "" : String(goal.weeklyRunCount),
    weeklyDistanceKm: goal?.weeklyDistanceKm == null ? "" : String(goal.weeklyDistanceKm),
  };
}
