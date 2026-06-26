export type ReminderRuleFormValues = {
  reminderTime: string;
  inAppEnabled: string;
  emailEnabled: string;
};

export type ReminderRuleFieldErrors = Partial<Record<keyof ReminderRuleFormValues, string>> & {
  form?: string;
};

export type ParsedReminderRuleInput =
  | {
      ok: true;
      data: {
        reminderTime: string;
        inAppEnabled: boolean;
        emailEnabled: boolean;
      };
      values: ReminderRuleFormValues;
    }
  | {
      ok: false;
      fieldErrors: ReminderRuleFieldErrors;
      values: ReminderRuleFormValues;
    };

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function parseReminderRuleFormValues(values: ReminderRuleFormValues): ParsedReminderRuleInput {
  const fieldErrors: ReminderRuleFieldErrors = {};
  const reminderTime = values.reminderTime.trim();

  if (!isValidTime(reminderTime)) {
    fieldErrors.reminderTime = "提醒时间必须是 HH:mm 格式";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values };
  }

  return {
    ok: true,
    data: {
      reminderTime,
      inAppEnabled: values.inAppEnabled === "on",
      emailEnabled: values.emailEnabled === "on",
    },
    values,
  };
}
