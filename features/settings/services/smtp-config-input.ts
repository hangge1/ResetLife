export type SmtpSecureMode = "none" | "ssl" | "starttls";

export type SmtpConfigFormValues = {
  host: string;
  port: string;
  username: string;
  password: string;
  fromEmail: string;
  secureMode: string;
};

export type SmtpConfigFieldErrors = Partial<Record<keyof SmtpConfigFormValues, string>> & {
  form?: string;
};

export type ParsedSmtpConfigInput =
  | {
      ok: true;
      data: {
        host: string;
        port: number;
        username: string;
        password: string;
        fromEmail: string;
        secureMode: SmtpSecureMode;
      };
      values: SmtpConfigFormValues;
    }
  | {
      ok: false;
      fieldErrors: SmtpConfigFieldErrors;
      values: SmtpConfigFormValues;
    };

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isSecureMode(value: string): value is SmtpSecureMode {
  return value === "none" || value === "ssl" || value === "starttls";
}

export function parseSmtpConfigFormValues(values: SmtpConfigFormValues): ParsedSmtpConfigInput {
  const fieldErrors: SmtpConfigFieldErrors = {};
  const host = values.host.trim();
  const port = Number(values.port.trim());
  const username = values.username.trim();
  const password = values.password;
  const fromEmail = values.fromEmail.trim();
  const secureMode = values.secureMode.trim();
  let parsedSecureMode: SmtpSecureMode | null = null;

  if (!host) {
    fieldErrors.host = "请填写 SMTP 主机";
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fieldErrors.port = "端口必须是 1 到 65535 之间的整数";
  }

  if (!isValidEmail(fromEmail)) {
    fieldErrors.fromEmail = "发件人地址格式不正确";
  }

  if (!isSecureMode(secureMode)) {
    fieldErrors.secureMode = "安全模式无效";
  } else {
    parsedSecureMode = secureMode;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values };
  }

  if (parsedSecureMode == null) {
    return { ok: false, fieldErrors: { secureMode: "安全模式无效" }, values };
  }

  return {
    ok: true,
    data: {
      host,
      port,
      username,
      password,
      fromEmail,
      secureMode: parsedSecureMode,
    },
    values,
  };
}
