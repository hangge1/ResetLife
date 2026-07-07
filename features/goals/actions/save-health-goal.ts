"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/features/access/services/route-guards";
import { createGoalsRepositoryForAuth } from "@/features/access/services/scoped-repositories";
import { saveHealthGoal } from "../services/goals-service.ts";
import { parseHealthGoalFormValues } from "../services/health-goal-input.ts";
import { healthGoalToFormValues, type HealthGoalFormState } from "./health-goal-form-state";

function formDataToValues(formData: FormData) {
  return {
    targetWeightKg: String(formData.get("targetWeightKg") ?? ""),
    targetWaistCm: String(formData.get("targetWaistCm") ?? ""),
    targetHipCm: String(formData.get("targetHipCm") ?? ""),
    targetBodyFatPercentage: String(formData.get("targetBodyFatPercentage") ?? ""),
  };
}

export async function saveHealthGoalAction(
  _previousState: HealthGoalFormState,
  formData: FormData,
): Promise<HealthGoalFormState> {
  const auth = await requireAuthContext();

  const values = formDataToValues(formData);
  const parsed = parseHealthGoalFormValues(values);

  if (!parsed.ok) {
    return {
      values: parsed.values,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const saved = saveHealthGoal(createGoalsRepositoryForAuth(auth), {
    ...parsed.data,
    nowIso: new Date().toISOString(),
  });

  if (!saved.ok) {
    const formMessage = "error" in saved ? saved.error.message : "健康目标保存失败";
    return {
      values,
      fieldErrors: { form: formMessage },
    };
  }

  revalidatePath("/goals");
  revalidatePath("/");
  revalidatePath("/data");

  return {
    values: healthGoalToFormValues(saved.data),
    fieldErrors: {},
    successMessage: "已保存健康目标",
  };
}
