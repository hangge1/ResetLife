"use server";

import { revalidatePath } from "next/cache";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { getTodayLocalDate } from "@/lib/dates";
import { createRecordsRepository } from "../repositories/records-repository.ts";
import { saveHealthRecord } from "../services/records-service.ts";
import { parseHealthRecordFormValues } from "../services/health-record-input.ts";
import { healthRecordToFormValues, type HealthRecordFormState } from "./health-record-form-state";

function formDataToValues(formData: FormData) {
  return {
    localDate: String(formData.get("localDate") ?? getTodayLocalDate()),
    weightKg: String(formData.get("weightKg") ?? ""),
    waistCm: String(formData.get("waistCm") ?? ""),
    hipCm: String(formData.get("hipCm") ?? ""),
    bodyFatPercentage: String(formData.get("bodyFatPercentage") ?? ""),
  };
}

export async function saveHealthRecordAction(
  _previousState: HealthRecordFormState,
  formData: FormData,
): Promise<HealthRecordFormState> {
  await requireTrustedDevice();

  const { localDate, ...values } = formDataToValues(formData);
  const parsed = parseHealthRecordFormValues(values);

  if (!parsed.ok) {
    return {
      values: parsed.values,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const saved = saveHealthRecord(createRecordsRepository(), {
    ...parsed.data,
    localDate,
    nowIso: new Date().toISOString(),
  });

  if (!saved.ok) {
    const formMessage = "error" in saved ? saved.error.message : (saved.fieldErrors.localDate ?? "健康记录保存失败");
    return {
      values,
      fieldErrors: { form: formMessage },
    };
  }

  revalidatePath("/records");
  revalidatePath("/history");

  return {
    values: healthRecordToFormValues(saved.data),
    fieldErrors: {},
    successMessage: `已保存 ${localDate} 的健康记录`,
  };
}
