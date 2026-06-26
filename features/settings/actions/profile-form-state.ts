import type { ProfileSettings } from "../services/profile-settings-service";
import type { ProfileFieldErrors, ProfileFormValues } from "../services/profile-input";

export type ProfileFormState = {
  values: ProfileFormValues;
  fieldErrors: ProfileFieldErrors;
  successMessage?: string;
};

export const emptyProfileFormValues: ProfileFormValues = {
  nickname: "",
  heightCm: "",
  reminderEmail: "",
};

export const initialProfileFormState: ProfileFormState = {
  values: emptyProfileFormValues,
  fieldErrors: {},
};

export function profileToFormValues(profile: ProfileSettings | null | undefined): ProfileFormValues {
  return {
    nickname: profile?.nickname ?? "",
    heightCm: profile?.heightCm == null ? "" : String(profile.heightCm),
    reminderEmail: profile?.reminderEmail ?? "",
  };
}
