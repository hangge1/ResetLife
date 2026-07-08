"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveReminderRuleAction } from "../actions/save-reminder-rule";
import { initialReminderRuleFormState, type ReminderRuleFormState } from "../actions/reminder-rule-form-state";

type ReminderRuleFormProps = {
  initialState: ReminderRuleFormState;
};

const reminderTimeOptions = Array.from({ length: 24 * 12 }, (_, index) => {
  const totalMinutes = index * 5;
  const hour = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minute = String(totalMinutes % 60).padStart(2, "0");

  return `${hour}:${minute}`;
});

export function ReminderRuleForm({ initialState }: ReminderRuleFormProps) {
  const [state, formAction, pending] = useActionState(saveReminderRuleAction, initialState);
  const values = state?.values ?? initialState.values ?? initialReminderRuleFormState.values;
  const fieldErrors = state?.fieldErrors ?? initialReminderRuleFormState.fieldErrors;
  const hasCurrentReminderTime = reminderTimeOptions.includes(values.reminderTime);

  return (
    <form action={formAction} className="grid gap-4">
      {state?.successMessage ? (
        <p className="rounded-md border border-[var(--health)] bg-[var(--health-soft)] px-3 py-2 text-sm text-[var(--ink-primary)]">
          {state.successMessage}
        </p>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="reminderTime" className="text-sm font-semibold text-[var(--ink-primary)]">
          每日提醒时间
        </label>
        <select
          id="reminderTime"
          name="reminderTime"
          defaultValue={values.reminderTime}
          aria-describedby={fieldErrors.reminderTime ? "reminderTime-error" : undefined}
          className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)] outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--primary)]"
        >
          {hasCurrentReminderTime ? null : <option value={values.reminderTime}>{values.reminderTime}</option>}
          {reminderTimeOptions.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
        {fieldErrors.reminderTime ? (
          <p id="reminderTime-error" className="text-sm text-[var(--danger)]">
            {fieldErrors.reminderTime}
          </p>
        ) : null}
      </div>

      <label className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 text-sm">
        <input name="inAppEnabled" type="checkbox" defaultChecked={values.inAppEnabled === "on"} />
        <span className="font-semibold text-[var(--ink-primary)]">站内提醒</span>
      </label>

      <label className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 text-sm">
        <input name="emailEnabled" type="checkbox" defaultChecked={values.emailEnabled === "on"} />
        <span className="font-semibold text-[var(--ink-primary)]">邮件提醒</span>
      </label>

      <p className="m-0 text-sm text-[var(--ink-secondary)]">
        邮件提醒需要先配置 SMTP 邮件和提醒收件邮箱；未配置完整时不会发送邮件。
      </p>

      <div>
        <Button type="submit" disabled={pending}>
          保存提醒规则
        </Button>
      </div>
    </form>
  );
}
