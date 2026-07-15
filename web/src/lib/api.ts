export type SessionUser = {
  mode: "user";
  userId: string;
  username: string;
  displayName: string | null;
  role: "admin" | "user";
};

export type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
};

export type LoginResponse = {
  authenticated: true;
  user: SessionUser;
  expiresAt: string;
};

export type AuthFailureResponse = {
  ok: false;
  fieldErrors?: Record<string, string>;
  form?: string;
};

export type SetupResponse = {
  needsInitialAdmin: boolean;
};

export type ManagedUserResponse = {
  id: string;
  username: string;
  displayName: string | null;
  role: "admin" | "user";
  createdAtIso: string;
  updatedAtIso: string;
  disabledAtIso: string | null;
};

export type ManagedUsersResponse = {
  users: ManagedUserResponse[];
};

export type SlimmingSummary = {
  healthSnapshot: {
    localDate: string;
    weightKg: number | null;
    waistCm: number | null;
    bodyFatPercentage: number | null;
  } | null;
  healthGoal: {
    targetWeightKg: number | null;
    targetWaistCm: number | null;
    targetHipCm: number | null;
    targetBodyFatPercentage: number | null;
  } | null;
  runGoal: {
    weeklyRunCount: number | null;
    weeklyDistanceKm: number | null;
  } | null;
  todayRun: {
    localDate: string;
    count: number;
    distanceKm: number;
  };
  totalRun: {
    count: number;
    distanceKm: number;
  };
};

export type HealthRecordResponse = {
  id: string;
  localDate: string;
  weightKg: number | null;
  waistCm: number | null;
  hipCm: number | null;
  bodyFatPercentage: number | null;
  createdAtIso?: string;
  updatedAtIso?: string;
};

export type RunRecordResponse = {
  id: string;
  localDate: string;
  distanceKm: number;
  durationSeconds: number | null;
  paceSecondsPerKm: number | null;
  averageHeartRateBpm: number | null;
  averageStrideMeters: number | null;
  cadenceSpm: number | null;
  createdAtIso?: string;
  updatedAtIso?: string;
};

export type HistoryEntry = {
  id: string;
  kind: "health" | "run";
  localDate: string;
  createdAtIso: string;
  health?: HealthRecordResponse;
  run?: RunRecordResponse;
};

export type SlimmingHistoryResponse = {
  entries: HistoryEntry[];
};

export type ProfileResponse = {
  nickname: string;
  heightCm: number | null;
  reminderEmail: string;
};

export type TrendThresholdsResponse = {
  minimumDays: number;
  minimumRecords: number;
};

export type ReminderRulesResponse = {
  reminderTime: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

export type SmtpConfigResponse = {
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  secureMode: "none" | "ssl" | "starttls";
  passwordConfigured: boolean;
};

export type TestEmailResponse = {
  message: string;
};

export type ReminderEventResponse = {
  id: string;
  userId: string;
  localDate: string;
  reminderType: string;
  channel: "in_app" | "email";
  status: "created" | "sent" | "failed" | "skipped";
  message: string;
  createdAtIso: string;
  updatedAtIso: string;
};

export type ReminderRunResponse = {
  checked: number;
  failed: number;
  failures: Array<{ userId: string; message: string }>;
  localDate: string;
  currentTime: string;
  nowIso: string;
  events?: ReminderEventResponse[];
};

export type LatestEmailReminderResponse = {
  event: ReminderEventResponse | null;
};

export type HealthGoalResponse = {
  targetWeightKg: number | null;
  targetWaistCm: number | null;
  targetHipCm: number | null;
  targetBodyFatPercentage: number | null;
};

export type RunGoalResponse = {
  weeklyRunCount: number | null;
  weeklyDistanceKm: number | null;
};

export class ApiRequestError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

export async function fetchSession(): Promise<SessionResponse> {
  const response = await fetch("/api/auth/session", {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Session request failed: ${response.status}`);
  }

  return response.json() as Promise<SessionResponse>;
}

export async function fetchSetupStatus(): Promise<SetupResponse> {
  const response = await fetch("/api/auth/setup", {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Setup request failed: ${response.status}`);
  }

  return response.json() as Promise<SetupResponse>;
}

export async function loginUser(input: { username: string; password: string }): Promise<LoginResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Login request failed: ${response.status}`, response.status, payload);
  }

  return payload as LoginResponse;
}

export async function createInitialAdmin(input: {
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}): Promise<LoginResponse> {
  const response = await fetch("/api/auth/setup", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Setup request failed: ${response.status}`, response.status, payload);
  }

  return payload as LoginResponse;
}

export async function logoutUser(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Logout request failed: ${response.status}`, response.status, payload);
  }
}

export async function fetchManagedUsers(): Promise<ManagedUsersResponse> {
  const response = await fetch("/api/admin/users", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Users request failed: ${response.status}`, response.status, payload);
  }
  return payload as ManagedUsersResponse;
}

export async function createManagedUser(input: {
  username: string;
  displayName: string;
  role: string;
  password: string;
  confirmPassword: string;
}): Promise<ManagedUserResponse> {
  const response = await fetch("/api/admin/users", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`User create failed: ${response.status}`, response.status, payload);
  }
  return payload as ManagedUserResponse;
}

export async function updateManagedUser(input: {
  userId: string;
  displayName: string;
  role: string;
  password: string;
  confirmPassword: string;
}): Promise<ManagedUserResponse> {
  const response = await fetch("/api/admin/users/update", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`User update failed: ${response.status}`, response.status, payload);
  }
  return payload as ManagedUserResponse;
}

export async function disableManagedUser(input: { userId: string }): Promise<ManagedUserResponse> {
  const response = await fetch("/api/admin/users/disable", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`User disable failed: ${response.status}`, response.status, payload);
  }
  return payload as ManagedUserResponse;
}

export async function fetchSlimmingSummary(): Promise<SlimmingSummary> {
  const response = await fetch("/api/slimming/summary", {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Summary request failed: ${response.status}`, response.status, payload);
  }

  return payload as SlimmingSummary;
}

export async function saveHealthRecord(input: {
  localDate: string;
  weightKg: string;
  waistCm: string;
  hipCm: string;
  bodyFatPercentage: string;
}): Promise<HealthRecordResponse> {
  const response = await fetch("/api/slimming/records/health", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Health record request failed: ${response.status}`, response.status, payload);
  }

  return payload as HealthRecordResponse;
}

export async function saveRunRecord(input: {
  localDate: string;
  distanceKm: string;
  durationMinutes: string;
  averageHeartRateBpm: string;
  averageStrideMeters: string;
  cadenceSpm: string;
}): Promise<RunRecordResponse> {
  const response = await fetch("/api/slimming/records/runs", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Run record request failed: ${response.status}`, response.status, payload);
  }

  return payload as RunRecordResponse;
}

export async function fetchSlimmingHistory(input: {
  type?: "all" | "health" | "run";
  range?: "all" | "last7" | "last30" | "custom";
  todayLocalDate?: string;
  startDate?: string;
  endDate?: string;
} = {}): Promise<SlimmingHistoryResponse> {
  const params = new URLSearchParams();
  if (input.type) params.set("type", input.type);
  if (input.range) params.set("range", input.range);
  if (input.todayLocalDate) params.set("todayLocalDate", input.todayLocalDate);
  if (input.startDate) params.set("startDate", input.startDate);
  if (input.endDate) params.set("endDate", input.endDate);

  const query = params.toString();
  const response = await fetch(`/api/slimming/history${query ? `?${query}` : ""}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`History request failed: ${response.status}`, response.status, payload);
  }

  return payload as SlimmingHistoryResponse;
}

export async function updateHealthRecord(input: {
  id: string;
  localDate: string;
  weightKg: string;
  waistCm: string;
  hipCm: string;
  bodyFatPercentage: string;
}): Promise<HealthRecordResponse> {
  const response = await fetch("/api/slimming/records/health/update", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Health record update failed: ${response.status}`, response.status, payload);
  }

  return payload as HealthRecordResponse;
}

export async function updateRunRecord(input: {
  id: string;
  localDate: string;
  distanceKm: string;
  durationMinutes: string;
  averageHeartRateBpm: string;
  averageStrideMeters: string;
  cadenceSpm: string;
}): Promise<RunRecordResponse> {
  const response = await fetch("/api/slimming/records/runs/update", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Run record update failed: ${response.status}`, response.status, payload);
  }

  return payload as RunRecordResponse;
}

export async function deleteSlimmingRecord(input: { id: string; kind: "health" | "run" }): Promise<void> {
  const response = await fetch("/api/slimming/records/delete", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Record delete failed: ${response.status}`, response.status, payload);
  }
}

export async function fetchProfile(): Promise<ProfileResponse> {
  const response = await fetch("/api/settings/profile", {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Profile request failed: ${response.status}`, response.status, payload);
  }

  return payload as ProfileResponse;
}

export async function saveProfile(input: {
  nickname: string;
  heightCm: string;
  reminderEmail: string;
}): Promise<ProfileResponse> {
  const response = await fetch("/api/settings/profile", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Profile save failed: ${response.status}`, response.status, payload);
  }

  return payload as ProfileResponse;
}

export async function fetchTrendThresholds(): Promise<TrendThresholdsResponse> {
  const response = await fetch("/api/settings/trend-thresholds", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Trend thresholds request failed: ${response.status}`, response.status, payload);
  }
  return payload as TrendThresholdsResponse;
}

export async function saveTrendThresholds(input: {
  minimumDays: string;
  minimumRecords: string;
}): Promise<TrendThresholdsResponse> {
  const response = await fetch("/api/settings/trend-thresholds", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Trend thresholds save failed: ${response.status}`, response.status, payload);
  }
  return payload as TrendThresholdsResponse;
}

export async function fetchReminderRules(): Promise<ReminderRulesResponse> {
  const response = await fetch("/api/settings/reminder-rules", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Reminder rules request failed: ${response.status}`, response.status, payload);
  }
  return payload as ReminderRulesResponse;
}

export async function saveReminderRules(input: {
  reminderTime: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}): Promise<ReminderRulesResponse> {
  const response = await fetch("/api/settings/reminder-rules", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Reminder rules save failed: ${response.status}`, response.status, payload);
  }
  return payload as ReminderRulesResponse;
}

export async function fetchSmtpConfig(): Promise<SmtpConfigResponse> {
  const response = await fetch("/api/settings/smtp", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`SMTP config request failed: ${response.status}`, response.status, payload);
  }
  return payload as SmtpConfigResponse;
}

export async function saveSmtpConfig(input: {
  host: string;
  port: string;
  username: string;
  password: string;
  fromEmail: string;
  secureMode: string;
}): Promise<SmtpConfigResponse> {
  const response = await fetch("/api/settings/smtp", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`SMTP config save failed: ${response.status}`, response.status, payload);
  }
  return payload as SmtpConfigResponse;
}

export async function clearSmtpConfig(): Promise<SmtpConfigResponse> {
  const response = await fetch("/api/settings/smtp/clear", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`SMTP config clear failed: ${response.status}`, response.status, payload);
  }
  return payload as SmtpConfigResponse;
}

export async function sendTestEmail(input: { recipientEmail: string }): Promise<TestEmailResponse> {
  const response = await fetch("/api/settings/smtp/test", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Test email failed: ${response.status}`, response.status, payload);
  }
  return payload as TestEmailResponse;
}

export async function runReminderChecks(): Promise<ReminderRunResponse> {
  const response = await fetch("/api/reminders/run", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Reminder run failed: ${response.status}`, response.status, payload);
  }
  return payload as ReminderRunResponse;
}

export async function fetchLatestEmailReminder(): Promise<LatestEmailReminderResponse> {
  const response = await fetch("/api/reminders/latest-email", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Latest email reminder request failed: ${response.status}`, response.status, payload);
  }
  return payload as LatestEmailReminderResponse;
}

export async function saveHealthGoal(input: {
  targetWeightKg: string;
  targetWaistCm: string;
  targetHipCm: string;
  targetBodyFatPercentage: string;
}): Promise<HealthGoalResponse> {
  const response = await fetch("/api/slimming/goals/health", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Health goal request failed: ${response.status}`, response.status, payload);
  }

  return payload as HealthGoalResponse;
}

export async function saveRunGoal(input: { weeklyRunCount: string; weeklyDistanceKm: string }): Promise<RunGoalResponse> {
  const response = await fetch("/api/slimming/goals/run", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await readJSON(response);
  if (!response.ok) {
    throw new ApiRequestError(`Run goal request failed: ${response.status}`, response.status, payload);
  }

  return payload as RunGoalResponse;
}

async function readJSON(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiRequestError("API returned invalid JSON", response.status);
  }
}
