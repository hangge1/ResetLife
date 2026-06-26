"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { clearSmtpConfigAction } from "../actions/clear-smtp-config";
import { saveSmtpConfigAction } from "../actions/save-smtp-config";
import { sendTestEmailAction } from "../actions/send-test-email";
import { initialTestEmailFormState } from "../actions/send-test-email-state";
import { initialSmtpConfigFormState, type SmtpConfigFormState } from "../actions/smtp-config-form-state";

type SmtpConfigFormProps = {
  initialState: SmtpConfigFormState;
  passwordConfigured: boolean;
};

const fields = [
  { name: "host", label: "SMTP 主机", unit: "", inputMode: "text" },
  { name: "port", label: "端口", unit: "", inputMode: "numeric" },
  { name: "username", label: "账号", unit: "", inputMode: "text" },
  { name: "password", label: "密码或授权码", unit: "", inputMode: "text" },
  { name: "fromEmail", label: "发件人地址", unit: "", inputMode: "email" },
] as const;

export function SmtpConfigForm({ initialState, passwordConfigured }: SmtpConfigFormProps) {
  const [state, formAction, pending] = useActionState(saveSmtpConfigAction, initialState);
  const [testState, testAction, testPending] = useActionState(sendTestEmailAction, initialTestEmailFormState);
  const [clearPending, startClearTransition] = useTransition();
  const values = state?.values ?? initialState.values ?? initialSmtpConfigFormState.values;
  const fieldErrors = state?.fieldErrors ?? initialSmtpConfigFormState.fieldErrors;

  return (
    <div className="grid gap-5">
      <form action={formAction} className="grid gap-4">
        {state?.successMessage ? (
          <p className="rounded-md border border-[var(--health)] bg-[var(--health-soft)] px-3 py-2 text-sm text-[var(--ink-primary)]">
            {state.successMessage}
          </p>
        ) : null}
        {fieldErrors.form ? <p className="text-sm text-[var(--danger)]">{fieldErrors.form}</p> : null}

        <div className="grid gap-3">
          {fields.map((field) => {
            const error = fieldErrors[field.name];
            const errorId = `${field.name}-error`;

            return (
              <div className="grid gap-2" key={field.name}>
                <label htmlFor={field.name} className="text-sm font-semibold text-[var(--ink-primary)]">
                  {field.label}
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  defaultValue={values[field.name]}
                  inputMode={field.inputMode}
                  type={field.name === "password" ? "password" : "text"}
                  placeholder={field.name === "password" && passwordConfigured ? "已保存，留空则不修改" : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)] outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--primary)]"
                />
                {error ? (
                  <p id={errorId} className="text-sm text-[var(--danger)]">
                    {error}
                  </p>
                ) : null}
              </div>
            );
          })}

          <div className="grid gap-2">
            <label htmlFor="secureMode" className="text-sm font-semibold text-[var(--ink-primary)]">
              安全模式
            </label>
            <select
              id="secureMode"
              name="secureMode"
              defaultValue={values.secureMode}
              className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)]"
            >
              <option value="none">None</option>
              <option value="ssl">SSL</option>
              <option value="starttls">STARTTLS</option>
            </select>
            {fieldErrors.secureMode ? <p className="text-sm text-[var(--danger)]">{fieldErrors.secureMode}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            保存 SMTP 配置
          </Button>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-sm font-semibold text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface-subtle)]"
            disabled={clearPending}
            onClick={() => {
              if (window.confirm("确认清空 SMTP 配置？当前邮件提醒将无法发送。")) {
                startClearTransition(() => {
                  void clearSmtpConfigAction();
                });
              }
            }}
            type="button"
          >
            清空 SMTP 配置
          </button>
        </div>
      </form>

      <form action={testAction} className="grid gap-3 border-t border-[var(--border-soft)] pt-4">
        <h3 className="m-0 text-base font-semibold text-[var(--ink-primary)]">测试邮件</h3>
        {testState?.successMessage ? (
          <p className="rounded-md border border-[var(--health)] bg-[var(--health-soft)] px-3 py-2 text-sm text-[var(--ink-primary)]">
            {testState.successMessage}
          </p>
        ) : null}
        {testState?.fieldErrors.form ? <p className="text-sm text-[var(--danger)]">{testState.fieldErrors.form}</p> : null}
        <div className="grid gap-2">
          <label htmlFor="recipientEmail" className="text-sm font-semibold text-[var(--ink-primary)]">
            测试收件邮箱
          </label>
          <input
            id="recipientEmail"
            name="recipientEmail"
            inputMode="email"
            className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)] outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--primary)]"
          />
          {testState?.fieldErrors.recipientEmail ? (
            <p className="text-sm text-[var(--danger)]">{testState.fieldErrors.recipientEmail}</p>
          ) : null}
        </div>
        <div>
          <Button type="submit" variant="secondary" disabled={testPending}>
            发送测试邮件
          </Button>
        </div>
      </form>
    </div>
  );
}
