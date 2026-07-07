"use server";

import { revalidatePath } from "next/cache";
import { requireUserAuthContext } from "@/features/access/services/route-guards";
import { createGlobalSettingsRepository } from "@/features/access/services/scoped-repositories";
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
  const auth = await requireUserAuthContext();

  if (auth.role !== "admin") {
    return {
      values: formDataToValues(formData),
      fieldErrors: { form: "只有管理员可以维护 SMTP 发信配置" },
    };
  }

  const values = formDataToValues(formData);
  const parsed = parseSmtpConfigFormValues(values);

  if (!parsed.ok) {
    return {
      values: parsed.values,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const saved = saveSmtpConfig(createGlobalSettingsRepository(), {
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
