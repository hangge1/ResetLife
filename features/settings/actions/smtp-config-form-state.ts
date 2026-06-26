import type { SmtpConfig } from "../services/smtp-config-service";
import type { SmtpConfigFieldErrors, SmtpConfigFormValues } from "../services/smtp-config-input";

export type SmtpConfigFormState = {
  values: SmtpConfigFormValues;
  fieldErrors: SmtpConfigFieldErrors;
  successMessage?: string;
};

export const initialSmtpConfigFormState: SmtpConfigFormState = {
  values: {
    host: "",
    port: "465",
    username: "",
    password: "",
    fromEmail: "",
    secureMode: "ssl",
  },
  fieldErrors: {},
};

export function smtpConfigToFormValues(config: SmtpConfig | null | undefined): SmtpConfigFormValues {
  return {
    host: config?.host ?? "",
    port: config?.port == null ? "465" : String(config.port),
    username: config?.username ?? "",
    password: "",
    fromEmail: config?.fromEmail ?? "",
    secureMode: config?.secureMode ?? "ssl",
  };
}
