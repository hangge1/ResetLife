"use server";

import { revalidatePath } from "next/cache";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { createRecordsRepository } from "../repositories/records-repository.ts";
import { updateRunRecord } from "../services/records-service.ts";
import { parseRunRecordEditValues } from "../services/run-record-input.ts";
import { runRecordToEditValues, type RunRecordEditFormState } from "./run-record-edit-state";

function formDataToValues(formData: FormData) {
  return {
    localDate: String(formData.get("localDate") ?? ""),
    distanceKm: String(formData.get("distanceKm") ?? ""),
    durationMinutes: String(formData.get("durationMinutes") ?? ""),
    paceMinutesPerKm: String(formData.get("paceMinutesPerKm") ?? ""),
    averageHeartRateBpm: String(formData.get("averageHeartRateBpm") ?? ""),
    averageStrideMeters: String(formData.get("averageStrideMeters") ?? ""),
    cadenceSpm: String(formData.get("cadenceSpm") ?? ""),
  };
}

export async function updateRunRecordAction(
  _previousState: RunRecordEditFormState,
  formData: FormData,
): Promise<RunRecordEditFormState> {
  await requireTrustedDevice();

  const id = String(formData.get("id") ?? "");
  const values = formDataToValues(formData);
  const parsed = parseRunRecordEditValues(values);

  if (!parsed.ok) {
    return { values: parsed.values, fieldErrors: parsed.fieldErrors };
  }

  const updated = updateRunRecord(createRecordsRepository(), id, {
    ...parsed.data,
    nowIso: new Date().toISOString(),
  });

  if (!updated.ok || !updated.data) {
    const message = updated.ok ? "跑步记录不存在" : ("error" in updated ? updated.error.message : "跑步记录保存失败");
    return { values, fieldErrors: { form: message } };
  }

  revalidatePath("/history");
  revalidatePath("/records");

  return {
    values: runRecordToEditValues(updated.data),
    fieldErrors: {},
    successMessage: "已保存跑步记录",
  };
}
