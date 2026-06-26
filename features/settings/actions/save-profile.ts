"use server";

import { revalidatePath } from "next/cache";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { createSettingsRepository } from "../repositories/settings-repository.ts";
import { parseProfileFormValues } from "../services/profile-input.ts";
import { saveProfileSettings } from "../services/profile-settings-service.ts";
import { profileToFormValues, type ProfileFormState } from "./profile-form-state";

function formDataToValues(formData: FormData) {
  return {
    nickname: String(formData.get("nickname") ?? ""),
    heightCm: String(formData.get("heightCm") ?? ""),
    reminderEmail: String(formData.get("reminderEmail") ?? ""),
  };
}

export async function saveProfileAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  await requireTrustedDevice();

  const values = formDataToValues(formData);
  const parsed = parseProfileFormValues(values);

  if (!parsed.ok) {
    return {
      values: parsed.values,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const saved = saveProfileSettings(createSettingsRepository(), {
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
    values: profileToFormValues(saved.data),
    fieldErrors: {},
    successMessage: "已保存个人资料",
  };
}
