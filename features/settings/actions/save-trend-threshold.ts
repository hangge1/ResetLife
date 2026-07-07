"use server";

import { revalidatePath } from "next/cache";
import { requireUserAuthContext } from "@/features/access/services/route-guards";
import { createSettingsRepositoryForAuth } from "@/features/access/services/scoped-repositories";
import { parseTrendThresholdFormValues } from "../services/trend-threshold-input.ts";
import { saveTrendThresholdSettings } from "../services/trend-threshold-settings-service.ts";
import { trendThresholdToFormValues, type TrendThresholdFormState } from "./trend-threshold-form-state";

function formDataToValues(formData: FormData) {
  return {
    minimumDays: String(formData.get("minimumDays") ?? ""),
    minimumRecords: String(formData.get("minimumRecords") ?? ""),
  };
}

export async function saveTrendThresholdAction(
  _previousState: TrendThresholdFormState,
  formData: FormData,
): Promise<TrendThresholdFormState> {
  const auth = await requireUserAuthContext();

  const values = formDataToValues(formData);
  const parsed = parseTrendThresholdFormValues(values);

  if (!parsed.ok) {
    return {
      values: parsed.values,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const saved = saveTrendThresholdSettings(createSettingsRepositoryForAuth(auth), {
    ...parsed.data,
    nowIso: new Date().toISOString(),
  });

  if (!saved.ok) {
    return {
      values,
      fieldErrors: saved.fieldErrors,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/");

  return {
    values: trendThresholdToFormValues(saved.data),
    fieldErrors: {},
    successMessage: "已保存趋势估算配置",
  };
}
