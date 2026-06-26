import type { ReminderRuleFieldErrors, ReminderRuleFormValues } from "../services/reminder-rule-input";
import type { ReminderRuleSettings } from "../services/reminder-rule-settings-service";

export type ReminderRuleFormState = {
  values: ReminderRuleFormValues;
  fieldErrors: ReminderRuleFieldErrors;
  successMessage?: string;
};

export const initialReminderRuleFormState: ReminderRuleFormState = {
  values: {
    reminderTime: "20:30",
    inAppEnabled: "",
    emailEnabled: "",
  },
  fieldErrors: {},
};

export function reminderRuleToFormValues(settings: ReminderRuleSettings): ReminderRuleFormValues {
  return {
    reminderTime: settings.reminderTime,
    inAppEnabled: settings.inAppEnabled ? "on" : "",
    emailEnabled: settings.emailEnabled ? "on" : "",
  };
}
