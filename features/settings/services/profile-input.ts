export type ProfileFormValues = {
  nickname: string;
  heightCm: string;
  reminderEmail: string;
};

export type ProfileFieldErrors = Partial<Record<keyof ProfileFormValues, string>> & {
  form?: string;
};

export type ParsedProfileInput =
  | {
      ok: true;
      data: {
        nickname: string;
        heightCm: number | null;
        reminderEmail: string;
      };
      values: ProfileFormValues;
    }
  | {
      ok: false;
      fieldErrors: ProfileFieldErrors;
      values: ProfileFormValues;
    };

function parseOptionalPositiveNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { empty: true as const };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { empty: false as const, valid: false as const };
  }

  return { empty: false as const, valid: true as const, value: parsed };
}

function isValidEmail(value: string) {
  if (!value.trim()) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function parseProfileFormValues(values: ProfileFormValues): ParsedProfileInput {
  const fieldErrors: ProfileFieldErrors = {};
  const height = parseOptionalPositiveNumber(values.heightCm);
  const reminderEmail = values.reminderEmail.trim();
  let parsedHeightCm: number | null = null;

  if (!height.empty && !height.valid) {
    fieldErrors.heightCm = "身高必须是大于 0 的数字";
  } else if (!height.empty) {
    parsedHeightCm = height.value;
  }

  if (!isValidEmail(reminderEmail)) {
    fieldErrors.reminderEmail = "邮箱格式不正确";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values };
  }

  return {
    ok: true,
    data: {
      nickname: values.nickname.trim(),
      heightCm: parsedHeightCm,
      reminderEmail,
    },
    values,
  };
}
