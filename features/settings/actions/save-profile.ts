"use server";

import { revalidatePath } from "next/cache";
import { requireUserAuthContext } from "@/features/access/services/route-guards";
import { createSettingsRepositoryForAuth } from "@/features/access/services/scoped-repositories";
import { parseProfileFormValues } from "../services/profile-input.ts";
import { getProfileSettings, saveProfileSettings } from "../services/profile-settings-service.ts";
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
  const auth = await requireUserAuthContext();
  const repository = createSettingsRepositoryForAuth(auth);
  const currentProfile = getProfileSettings(repository);

  const values = {
    ...formDataToValues(formData),
    reminderEmail: currentProfile.ok ? currentProfile.data.reminderEmail : "",
  };
  const parsed = parseProfileFormValues(values);

  if (!parsed.ok) {
    return {
      values: parsed.values,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const saved = saveProfileSettings(repository, {
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
