"use server";

import { revalidatePath } from "next/cache";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { createSettingsRepository } from "../repositories/settings-repository.ts";
import { parseSmtpConfigFormValues } from "../services/smtp-config-input.ts";
import { saveSmtpConfig } from "../services/smtp-config-service.ts";
import { smtpConfigToFormValues, type SmtpConfigFormState } from "./smtp-config-form-state";

function formDataToValues(formData: FormData) {
  return {
    host: String(formData.get("host") ?? ""),
    port: String(formData.get("port") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    fromEmail: String(formData.get("fromEmail") ?? ""),
    secureMode: String(formData.get("secureMode") ?? ""),
  };
}

export async function saveSmtpConfigAction(
  _previousState: SmtpConfigFormState,
  formData: FormData,
): Promise<SmtpConfigFormState> {
  await requireTrustedDevice();

  const values = formDataToValues(formData);
  const parsed = parseSmtpConfigFormValues(values);

  if (!parsed.ok) {
    return {
      values: parsed.values,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const saved = saveSmtpConfig(createSettingsRepository(), {
    ...parsed.data,
    nowIso: new Date().toISOString(),
  });

  if (!saved.ok) {
    return { values, fieldErrors: saved.fieldErrors };
  }

  revalidatePath("/settings");

  return {
    values: smtpConfigToFormValues(saved.data),
    fieldErrors: {},
    successMessage: "已保存 SMTP 配置",
  };
}
