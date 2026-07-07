"use server";

import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/features/access/services/route-guards";
import { createRecordsRepositoryForAuth } from "@/features/access/services/scoped-repositories";
import { getTodayLocalDate } from "@/lib/dates";
import { createRunRecord } from "../services/records-service.ts";
import { parseRunRecordFormValues } from "../services/run-record-input.ts";
import {
  emptyRunRecordFormValues,
  type RunRecordFormState,
} from "./run-record-form-state";

function formDataToValues(formData: FormData) {
  return {
    localDate: String(formData.get("localDate") ?? getTodayLocalDate()),
    distanceKm: String(formData.get("distanceKm") ?? ""),
    durationMinutes: String(formData.get("durationMinutes") ?? ""),
    paceMinutesPerKm: String(formData.get("paceMinutesPerKm") ?? ""),
    averageHeartRateBpm: String(formData.get("averageHeartRateBpm") ?? ""),
    averageStrideMeters: String(formData.get("averageStrideMeters") ?? ""),
    cadenceSpm: String(formData.get("cadenceSpm") ?? ""),
  };
}

export async function saveRunRecordAction(
  _previousState: RunRecordFormState,
  formData: FormData,
): Promise<RunRecordFormState> {
  const auth = await requireAuthContext();

  const { localDate, ...values } = formDataToValues(formData);
  const parsed = parseRunRecordFormValues(values);

  if (!parsed.ok) {
    return {
      values: parsed.values,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const saved = createRunRecord(createRecordsRepositoryForAuth(auth), {
    ...parsed.data,
    localDate,
    nowIso: new Date().toISOString(),
  });

  if (!saved.ok) {
    const formMessage = "error" in saved ? saved.error.message : (saved.fieldErrors.localDate ?? "跑步记录保存失败");
    return {
      values,
      fieldErrors: { form: formMessage },
    };
  }

  revalidatePath("/records");
  revalidatePath("/history");

  return {
    values: emptyRunRecordFormValues,
    fieldErrors: {},
    successMessage: `已保存 ${localDate} 的跑步记录`,
  };
}
