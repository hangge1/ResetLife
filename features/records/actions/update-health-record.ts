"use server";

import { revalidatePath } from "next/cache";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { createRecordsRepository } from "../repositories/records-repository.ts";
import { updateHealthRecord } from "../services/records-service.ts";
import { parseHealthRecordEditValues } from "../services/health-record-input.ts";
import { healthRecordToEditValues, type HealthRecordEditFormState } from "./health-record-edit-state";

function formDataToValues(formData: FormData) {
  return {
    localDate: String(formData.get("localDate") ?? ""),
    weightKg: String(formData.get("weightKg") ?? ""),
    waistCm: String(formData.get("waistCm") ?? ""),
    hipCm: String(formData.get("hipCm") ?? ""),
    bodyFatPercentage: String(formData.get("bodyFatPercentage") ?? ""),
  };
}

export async function updateHealthRecordAction(
  _previousState: HealthRecordEditFormState,
  formData: FormData,
): Promise<HealthRecordEditFormState> {
  await requireTrustedDevice();

  const id = String(formData.get("id") ?? "");
  const values = formDataToValues(formData);
  const parsed = parseHealthRecordEditValues(values);

  if (!parsed.ok) {
    return { values: parsed.values, fieldErrors: parsed.fieldErrors };
  }

  const updated = updateHealthRecord(createRecordsRepository(), id, {
    ...parsed.data,
    nowIso: new Date().toISOString(),
  });

  if (!updated.ok || !updated.data) {
    const message = updated.ok ? "健康记录不存在" : ("error" in updated ? updated.error.message : "健康记录保存失败");
    return { values, fieldErrors: { form: message } };
  }

  revalidatePath("/history");
  revalidatePath("/records");

  return {
    values: healthRecordToEditValues(updated.data),
    fieldErrors: {},
    successMessage: "已保存健康记录",
  };
}
