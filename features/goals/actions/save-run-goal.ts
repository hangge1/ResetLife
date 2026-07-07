"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/features/access/services/route-guards";
import { createGoalsRepositoryForAuth } from "@/features/access/services/scoped-repositories";
import { saveRunGoal } from "../services/goals-service.ts";
import { parseRunGoalFormValues } from "../services/run-goal-input.ts";
import { runGoalToFormValues, type RunGoalFormState } from "./run-goal-form-state";

function formDataToValues(formData: FormData) {
  return {
    weeklyRunCount: String(formData.get("weeklyRunCount") ?? ""),
    weeklyDistanceKm: String(formData.get("weeklyDistanceKm") ?? ""),
  };
}

export async function saveRunGoalAction(
  _previousState: RunGoalFormState,
  formData: FormData,
): Promise<RunGoalFormState> {
  const auth = await requireAuthContext();

  const values = formDataToValues(formData);
  const parsed = parseRunGoalFormValues(values);

  if (!parsed.ok) {
    return {
      values: parsed.values,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const saved = saveRunGoal(createGoalsRepositoryForAuth(auth), {
    ...parsed.data,
    nowIso: new Date().toISOString(),
  });

  if (!saved.ok) {
    const formMessage = "error" in saved ? saved.error.message : "跑步目标保存失败";
    return {
      values,
      fieldErrors: { form: formMessage },
    };
  }

  revalidatePath("/goals");
  revalidatePath("/");
  revalidatePath("/data");

  return {
    values: runGoalToFormValues(saved.data),
    fieldErrors: {},
    successMessage: "已保存跑步目标",
  };
}
