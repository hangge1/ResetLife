<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watchEffect } from "vue";
import {
  ApiRequestError,
  clearSmtpConfig,
  createManagedUser,
  deleteSlimmingRecord,
  disableManagedUser,
  fetchLatestEmailReminder,
  fetchManagedUsers,
  fetchProfile,
  fetchReminderRules,
  fetchSession,
  fetchSlimmingHistory,
  fetchSlimmingSummary,
  fetchSmtpConfig,
  loginUser,
  logoutUser,
  runReminderChecks,
  saveHealthGoal,
  saveHealthRecord,
  saveProfile,
  saveReminderRules,
  saveRunGoal,
  saveRunRecord,
  saveSmtpConfig,
  sendTestEmail,
  updateHealthRecord,
  updateRunRecord,
  type AuthFailureResponse,
  type HistoryEntry,
  type LatestEmailReminderResponse,
  type ManagedUserResponse,
  type ReminderRulesResponse,
  type SessionResponse,
  type SlimmingSummary,
  type SmtpConfigResponse,
} from "@/lib/api";

const loading = ref(true);
const authBusy = ref(false);
const authSceneRef = ref<HTMLElement | null>(null);
const appMotionRef = ref<HTMLElement | null>(null);
let cleanupAuthMotion = () => {};
let cleanupAppMotion = () => {};
const session = ref<SessionResponse | null>(null);
const pageError = ref("");

const username = ref("");
const password = ref("");
const authMessage = ref("");
const authErrors = ref<Record<string, string>>({});

const summary = ref<SlimmingSummary | null>(null);
const summaryError = ref("");

const recordBusy = ref(false);
const recordMessage = ref("");
const recordErrors = ref<Record<string, string>>({});
const healthLocalDate = ref(todayLocalDate());
const healthWeightKg = ref("");
const healthWaistCm = ref("");
const healthHipCm = ref("");
const healthBodyFatPercentage = ref("");
const runLocalDate = ref(todayLocalDate());
const runDistanceKm = ref("");
const runDurationMinutes = ref("");
const runAverageHeartRateBpm = ref("");
const runAverageStrideMeters = ref("");
const runCadenceSpm = ref("");
const editingHealthId = ref("");
const editingRunId = ref("");

const goalBusy = ref(false);
const goalMessage = ref("");
const goalErrors = ref<Record<string, string>>({});
const targetWeightKg = ref("");
const targetWaistCm = ref("");
const targetHipCm = ref("");
const targetBodyFatPercentage = ref("");
const weeklyRunCount = ref("");
const weeklyDistanceKm = ref("");

const historyBusy = ref(false);
const historyError = ref("");
const historyMessage = ref("");
const historyType = ref<"all" | "health" | "run">("all");
const historyRange = ref<"all" | "last7" | "last30" | "custom">("last30");
const historyStartDate = ref("");
const historyEndDate = ref("");
const historyEntries = ref<HistoryEntry[]>([]);

const settingsBusy = ref(false);
const settingsMessage = ref("");
const settingsError = ref("");
const profileNickname = ref("");
const profileHeightCm = ref("");
const profileReminderEmail = ref("");
const reminderRules = ref<ReminderRulesResponse>({
  reminderTime: "21:00",
  inAppEnabled: true,
  emailEnabled: false,
});
const latestEmailReminder = ref<LatestEmailReminderResponse["event"] | null>(null);
const reminderRunMessage = ref("");

const smtpConfig = ref<SmtpConfigResponse>({
  host: "",
  port: 587,
  username: "",
  fromEmail: "",
  secureMode: "starttls",
  passwordConfigured: false,
});
const smtpPassword = ref("");
const smtpTestEmail = ref("");

const users = ref<ManagedUserResponse[]>([]);
const newUserUsername = ref("");
const newUserDisplayName = ref("");
const newUserRole = ref<"admin" | "user">("user");
const newUserPassword = ref("");
const newUserConfirmPassword = ref("");

const authenticated = computed(() => Boolean(session.value?.authenticated));
const currentUser = computed(() => session.value?.user ?? null);
const isAdmin = computed(() => currentUser.value?.role === "admin");
const showAuthPage = computed(() => loading.value || !authenticated.value);
type ActiveSection = "dashboard" | "records" | "data" | "history" | "settings";
type CardTone = "health-goal" | "motion-goal" | "checkin" | "week" | "total";
type DashboardCard = {
  title: string;
  value: string;
  detail: string;
  action: string;
  section: ActiveSection;
  tone: CardTone;
  state: string;
};
const activeSection = ref<ActiveSection>("dashboard");
const activeSections = new Set<ActiveSection>(["dashboard", "records", "data", "history", "settings"]);
const sectionOrder: ActiveSection[] = ["dashboard", "records", "data", "history", "settings"];
const sectionLabels: Record<ActiveSection, string> = {
  dashboard: "首页",
  records: "打卡",
  data: "数据",
  history: "历史",
  settings: "设置",
};
const previousSection = computed(() => {
  const index = sectionOrder.indexOf(activeSection.value);
  return index > 0 ? sectionOrder[index - 1] : null;
});
const nextSection = computed(() => {
  const index = sectionOrder.indexOf(activeSection.value);
  return index >= 0 && index < sectionOrder.length - 1 ? sectionOrder[index + 1] : null;
});

const dashboardCards = computed<DashboardCard[]>(() => [
  {
    title: "健康目标",
    value: summary.value?.healthGoal?.targetWeightKg ? `${formatNumber(summary.value.healthGoal.targetWeightKg)} 公斤` : "未设置",
    detail: summary.value?.healthSnapshot?.weightKg
      ? `当前 ${formatNumber(summary.value.healthSnapshot.weightKg)} 公斤`
      : "今天还没有健康记录",
    action: summary.value?.healthGoal?.targetWeightKg ? "调整健康目标" : "设置健康目标",
    section: "data",
    tone: "health-goal",
    state: summary.value?.healthGoal?.targetWeightKg ? "active" : "unset",
  },
  {
    title: "运动目标",
    value: summary.value?.runGoal?.weeklyDistanceKm ? `${formatNumber(summary.value.runGoal.weeklyDistanceKm)} 公里` : "未设置",
    detail: summary.value?.runGoal?.weeklyRunCount ? `每周 ${summary.value.runGoal.weeklyRunCount} 次` : "可以在目标里设置",
    action: summary.value?.runGoal?.weeklyDistanceKm ? "调整运动目标" : "设置运动目标",
    section: "data",
    tone: "motion-goal",
    state: summary.value?.runGoal?.weeklyDistanceKm ? "active" : "unset",
  },
  {
    title: "今日打卡",
    value: summary.value ? `${summary.value.todayRun.count} 次` : "未加载",
    detail: summary.value ? `${formatNumber(summary.value.todayRun.distanceKm)} 公里` : "正在读取数据",
    action: "去打卡",
    section: "records",
    tone: "checkin",
    state: summary.value && summary.value.todayRun.count > 0 ? "done" : "missing",
  },
  {
    title: "本周跑量",
    value: `${formatNumber(weekRunStats.value.distanceKm)} 公里`,
    detail: `${weekRunStats.value.count} 次 · 目标 ${
      summary.value?.runGoal?.weeklyDistanceKm ? formatNumber(summary.value.runGoal.weeklyDistanceKm) : "未设置"
    } 公里`,
    action: "看分析",
    section: "data",
    tone: "week",
    state: "active",
  },
  {
    title: "累计跑量",
    value: summary.value ? `${formatNumber(summary.value.totalRun.distanceKm)} 公里` : "未加载",
    detail: summary.value ? `累计 ${summary.value.totalRun.count} 次` : "正在读取数据",
    action: "看历史",
    section: "history",
    tone: "total",
    state: "active",
  },
]);

const dataSummaryCards = computed(() => [
  {
    title: "当前体重",
    value: summary.value?.healthSnapshot?.weightKg ? `${formatNumber(summary.value.healthSnapshot.weightKg)} 公斤` : "未记录",
    detail: summary.value?.healthGoal?.targetWeightKg
      ? `目标 ${formatNumber(summary.value.healthGoal.targetWeightKg)} 公斤`
      : "未设置体重目标",
  },
  {
    title: "当前腰围",
    value: summary.value?.healthSnapshot?.waistCm ? `${formatNumber(summary.value.healthSnapshot.waistCm)} 厘米` : "未记录",
    detail: summary.value?.healthGoal?.targetWaistCm
      ? `目标 ${formatNumber(summary.value.healthGoal.targetWaistCm)} 厘米`
      : "未设置腰围目标",
  },
  {
    title: "今日跑量",
    value: summary.value ? `${formatNumber(summary.value.todayRun.distanceKm)} 公里` : "未加载",
    detail: summary.value ? `今日 ${summary.value.todayRun.count} 次` : "正在读取数据",
  },
  {
    title: "累计跑量",
    value: summary.value ? `${formatNumber(summary.value.totalRun.distanceKm)} 公里` : "未加载",
    detail: summary.value ? `累计 ${summary.value.totalRun.count} 次` : "正在读取数据",
  },
]);

const weekRunStats = computed(() => {
  const weekStart = startOfWeekDate(todayLocalDate());
  return historyEntries.value.reduce(
    (total, entry) => {
      if (entry.kind !== "run" || !entry.run || !isDateInCurrentWeek(entry.localDate, weekStart)) {
        return total;
      }
      return {
        count: total.count + 1,
        distanceKm: total.distanceKm + entry.run.distanceKm,
      };
    },
    { count: 0, distanceKm: 0 },
  );
});

function todayLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function startOfWeekDate(localDate: string) {
  const date = new Date(`${localDate}T00:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function isDateInCurrentWeek(localDate: string, weekStart: Date) {
  const date = new Date(`${localDate}T00:00:00`);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "未记录";
  return Number(value).toFixed(digits).replace(/\.0$/, "");
}

function minutesFromSeconds(seconds: number | null | undefined) {
  if (!seconds) return "";
  return formatNumber(seconds / 60, 0);
}

function apiDetails(error: unknown): AuthFailureResponse | null {
  if (!(error instanceof ApiRequestError)) return null;
  if (!error.details || typeof error.details !== "object") return null;
  return error.details as AuthFailureResponse;
}

function setFormFailure(target: typeof authMessage, errors: typeof authErrors, error: unknown, fallback: string) {
  const details = apiDetails(error);
  errors.value = details?.fieldErrors ?? {};
  target.value = fallback;
}

function fieldError(errors: Record<string, string>, name: string, fallback: string) {
  return errors[name] ? fallback : "";
}

function normalizeSection(value: string): ActiveSection {
  const section = value.replace(/^#/, "") as ActiveSection;
  return activeSections.has(section) ? section : "dashboard";
}

function syncActiveSectionFromHash() {
  activeSection.value = normalizeSection(window.location.hash);
}

function handleSectionHashChange() {
  syncActiveSectionFromHash();
}

function setActiveSection(section: ActiveSection) {
  activeSection.value = section;
  const nextUrl =
    section === "dashboard"
      ? `${window.location.pathname}${window.location.search}`
      : `${window.location.pathname}${window.location.search}#${section}`;
  window.history.pushState(null, "", nextUrl);
}

function isActiveSection(section: ActiveSection) {
  return activeSection.value === section;
}

function handleCardKeydown(event: KeyboardEvent, section: ActiveSection) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  setActiveSection(section);
}

function reminderStatusText(status: string) {
  switch (status) {
    case "created":
      return "已创建";
    case "sent":
      return "已发送";
    case "failed":
      return "发送失败";
    case "skipped":
      return "已跳过";
    default:
      return "未知状态";
  }
}

function reminderMessageText(status: string) {
  switch (status) {
    case "sent":
      return "最近一次邮件提醒已发送。";
    case "failed":
      return "最近一次邮件提醒发送失败。";
    case "skipped":
      return "最近一次邮件提醒已跳过，请检查提醒邮箱和邮件服务器配置。";
    case "created":
      return "最近一次提醒已创建。";
    default:
      return "最近一次提醒状态无法识别。";
  }
}

async function refreshSession() {
  loading.value = true;
  pageError.value = "";
  try {
    const currentSession = await fetchSession();
    session.value = currentSession;
    if (currentSession.authenticated) {
      await loadAppData();
    }
  } catch {
    pageError.value = "无法连接后端服务，请确认服务已经启动。";
  } finally {
    loading.value = false;
  }
}

function installAuthMotion() {
  void nextTick(() => {
    const scene = authSceneRef.value;
    if (!scene || typeof window === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduceMotion || !finePointer) return;

    let frameId = 0;
    let currentX = 68;
    let currentY = 38;
    let targetX = currentX;
    let targetY = currentY;
    let clickTimer = 0;

    const setPointerVars = (x: number, y: number) => {
      scene.style.setProperty("--auth-pointer-x", `${x.toFixed(2)}%`);
      scene.style.setProperty("--auth-pointer-y", `${y.toFixed(2)}%`);
    };
    const readPointer = (event: PointerEvent) => {
      const rect = scene.getBoundingClientRect();
      return {
        x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
        y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100)),
      };
    };
    const render = () => {
      currentX += (targetX - currentX) * 0.14;
      currentY += (targetY - currentY) * 0.14;
      setPointerVars(currentX, currentY);
      frameId = window.requestAnimationFrame(render);
    };
    const handlePointerMove = (event: PointerEvent) => {
      const pointer = readPointer(event);
      targetX = pointer.x;
      targetY = pointer.y;
    };
    const handlePointerDown = (event: PointerEvent) => {
      const pointer = readPointer(event);
      scene.style.setProperty("--auth-click-x", `${pointer.x.toFixed(2)}%`);
      scene.style.setProperty("--auth-click-y", `${pointer.y.toFixed(2)}%`);
      scene.dataset.click = "on";
      if (clickTimer) window.clearTimeout(clickTimer);
      clickTimer = window.setTimeout(() => {
        scene.dataset.click = "off";
      }, 560);
    };
    const handlePointerLeave = () => {
      targetX = 68;
      targetY = 38;
    };

    frameId = window.requestAnimationFrame(render);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    cleanupAuthMotion = () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerleave", handlePointerLeave);
      if (clickTimer) window.clearTimeout(clickTimer);
      cleanupAuthMotion = () => {};
    };
  });
}

function installAppMotion() {
  void nextTick(() => {
    const layer = appMotionRef.value;
    if (!layer || typeof window === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduceMotion || !finePointer) return;

    let frameId = 0;
    let currentX = 50;
    let currentY = 42;
    let targetX = currentX;
    let targetY = currentY;

    const render = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      layer.style.setProperty("--home-pointer-x", `${currentX.toFixed(2)}%`);
      layer.style.setProperty("--home-pointer-y", `${currentY.toFixed(2)}%`);
      frameId = window.requestAnimationFrame(render);
    };
    const handlePointerMove = (event: PointerEvent) => {
      const rect = layer.getBoundingClientRect();
      targetX = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
      targetY = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    };
    const handlePointerLeave = () => {
      targetX = 50;
      targetY = 42;
    };

    frameId = window.requestAnimationFrame(render);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    cleanupAppMotion = () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      cleanupAppMotion = () => {};
    };
  });
}

async function loadAppData() {
  await Promise.all([loadSummary(), loadHistory(), loadSettings()]);
}

async function submitAuth() {
  authBusy.value = true;
  authMessage.value = "";
  authErrors.value = {};
  try {
    const result = await loginUser({ username: username.value, password: password.value });
    session.value = { authenticated: true, user: result.user };
    setActiveSection("dashboard");
    password.value = "";
    await loadAppData();
  } catch (error) {
    setFormFailure(authMessage, authErrors, error, "登录失败。");
  } finally {
    authBusy.value = false;
  }
}

async function submitLogout() {
  await logoutUser();
  session.value = { authenticated: false, user: null };
  summary.value = null;
  historyEntries.value = [];
}

async function loadSummary() {
  summaryError.value = "";
  try {
    summary.value = await fetchSlimmingSummary();
    targetWeightKg.value = summary.value.healthGoal?.targetWeightKg?.toString() ?? "";
    targetWaistCm.value = summary.value.healthGoal?.targetWaistCm?.toString() ?? "";
    targetHipCm.value = summary.value.healthGoal?.targetHipCm?.toString() ?? "";
    targetBodyFatPercentage.value = summary.value.healthGoal?.targetBodyFatPercentage?.toString() ?? "";
    weeklyRunCount.value = summary.value.runGoal?.weeklyRunCount?.toString() ?? "";
    weeklyDistanceKm.value = summary.value.runGoal?.weeklyDistanceKm?.toString() ?? "";
  } catch {
    summaryError.value = "首页数据加载失败。";
  }
}

async function submitHealthRecord() {
  recordBusy.value = true;
  recordMessage.value = "";
  recordErrors.value = {};
  try {
    const payload = {
      localDate: healthLocalDate.value,
      weightKg: healthWeightKg.value,
      waistCm: healthWaistCm.value,
      hipCm: healthHipCm.value,
      bodyFatPercentage: healthBodyFatPercentage.value,
    };
    if (editingHealthId.value) {
      await updateHealthRecord({ id: editingHealthId.value, ...payload });
      recordMessage.value = "健康记录已更新。";
    } else {
      await saveHealthRecord(payload);
      recordMessage.value = "健康记录已保存。";
    }
    resetHealthForm();
    await loadSummary();
    await loadHistory();
  } catch (error) {
    setFormFailure(recordMessage, recordErrors, error, "健康记录保存失败。");
  } finally {
    recordBusy.value = false;
  }
}

async function submitRunRecord() {
  recordBusy.value = true;
  recordMessage.value = "";
  recordErrors.value = {};
  try {
    const payload = {
      localDate: runLocalDate.value,
      distanceKm: runDistanceKm.value,
      durationMinutes: runDurationMinutes.value,
      averageHeartRateBpm: runAverageHeartRateBpm.value,
      averageStrideMeters: runAverageStrideMeters.value,
      cadenceSpm: runCadenceSpm.value,
    };
    if (editingRunId.value) {
      await updateRunRecord({ id: editingRunId.value, ...payload });
      recordMessage.value = "跑步记录已更新。";
    } else {
      await saveRunRecord(payload);
      recordMessage.value = "跑步记录已保存。";
    }
    resetRunForm();
    await loadSummary();
    await loadHistory();
  } catch (error) {
    setFormFailure(recordMessage, recordErrors, error, "跑步记录保存失败。");
  } finally {
    recordBusy.value = false;
  }
}

function resetHealthForm() {
  editingHealthId.value = "";
  healthLocalDate.value = todayLocalDate();
  healthWeightKg.value = "";
  healthWaistCm.value = "";
  healthHipCm.value = "";
  healthBodyFatPercentage.value = "";
}

function resetRunForm() {
  editingRunId.value = "";
  runLocalDate.value = todayLocalDate();
  runDistanceKm.value = "";
  runDurationMinutes.value = "";
  runAverageHeartRateBpm.value = "";
  runAverageStrideMeters.value = "";
  runCadenceSpm.value = "";
}

async function submitGoals() {
  goalBusy.value = true;
  goalMessage.value = "";
  goalErrors.value = {};
  try {
    await Promise.all([
      saveHealthGoal({
        targetWeightKg: targetWeightKg.value,
        targetWaistCm: targetWaistCm.value,
        targetHipCm: targetHipCm.value,
        targetBodyFatPercentage: targetBodyFatPercentage.value,
      }),
      saveRunGoal({
        weeklyRunCount: weeklyRunCount.value,
        weeklyDistanceKm: weeklyDistanceKm.value,
      }),
    ]);
    goalMessage.value = "目标已保存。";
    await loadSummary();
  } catch (error) {
    setFormFailure(goalMessage, goalErrors, error, "目标保存失败。");
  } finally {
    goalBusy.value = false;
  }
}

async function loadHistory() {
  historyBusy.value = true;
  historyError.value = "";
  try {
    const result = await fetchSlimmingHistory({
      type: historyType.value,
      range: historyRange.value,
      todayLocalDate: todayLocalDate(),
      startDate: historyStartDate.value,
      endDate: historyEndDate.value,
    });
    historyEntries.value = result.entries;
  } catch {
    historyError.value = "历史记录加载失败。";
  } finally {
    historyBusy.value = false;
  }
}

function editEntry(entry: HistoryEntry) {
  historyMessage.value = "";
  if (entry.kind === "health" && entry.health) {
    editingHealthId.value = entry.id;
    healthLocalDate.value = entry.health.localDate;
    healthWeightKg.value = entry.health.weightKg?.toString() ?? "";
    healthWaistCm.value = entry.health.waistCm?.toString() ?? "";
    healthHipCm.value = entry.health.hipCm?.toString() ?? "";
    healthBodyFatPercentage.value = entry.health.bodyFatPercentage?.toString() ?? "";
    setActiveSection("records");
    return;
  }
  if (entry.kind === "run" && entry.run) {
    editingRunId.value = entry.id;
    runLocalDate.value = entry.run.localDate;
    runDistanceKm.value = entry.run.distanceKm.toString();
    runDurationMinutes.value = minutesFromSeconds(entry.run.durationSeconds);
    runAverageHeartRateBpm.value = entry.run.averageHeartRateBpm?.toString() ?? "";
    runAverageStrideMeters.value = entry.run.averageStrideMeters?.toString() ?? "";
    runCadenceSpm.value = entry.run.cadenceSpm?.toString() ?? "";
    setActiveSection("records");
  }
}

async function removeEntry(entry: HistoryEntry) {
  historyMessage.value = "";
  try {
    await deleteSlimmingRecord({ id: entry.id, kind: entry.kind });
    historyMessage.value = "记录已删除。";
    await loadSummary();
    await loadHistory();
  } catch {
    historyError.value = "记录删除失败。";
  }
}

async function loadSettings() {
  settingsError.value = "";
  try {
    const [profile, rules, latest] = await Promise.all([fetchProfile(), fetchReminderRules(), fetchLatestEmailReminder()]);
    profileNickname.value = profile.nickname;
    profileHeightCm.value = profile.heightCm?.toString() ?? "";
    profileReminderEmail.value = profile.reminderEmail;
    reminderRules.value = rules;
    latestEmailReminder.value = latest.event;
    if (isAdmin.value) {
      const [smtp, managedUsers] = await Promise.all([fetchSmtpConfig(), fetchManagedUsers()]);
      smtpConfig.value = smtp;
      users.value = managedUsers.users;
    }
  } catch {
    settingsError.value = "设置数据加载失败。";
  }
}

async function saveUserSettings() {
  settingsBusy.value = true;
  settingsMessage.value = "";
  settingsError.value = "";
  try {
    await Promise.all([
      saveProfile({
        nickname: profileNickname.value,
        heightCm: profileHeightCm.value,
        reminderEmail: profileReminderEmail.value,
      }),
      saveReminderRules(reminderRules.value),
    ]);
    settingsMessage.value = "设置已保存。";
  } catch {
    settingsError.value = "设置保存失败。";
  } finally {
    settingsBusy.value = false;
  }
}

async function runReminderNow() {
  reminderRunMessage.value = "";
  try {
    const result = await runReminderChecks();
    reminderRunMessage.value = `已检查 ${result.checked} 个用户，失败 ${result.failed} 个。`;
    await loadSettings();
  } catch {
    reminderRunMessage.value = "提醒检查执行失败。";
  }
}

async function saveSmtpSettings() {
  settingsBusy.value = true;
  settingsMessage.value = "";
  settingsError.value = "";
  try {
    smtpConfig.value = await saveSmtpConfig({
      host: smtpConfig.value.host,
      port: smtpConfig.value.port.toString(),
      username: smtpConfig.value.username,
      password: smtpPassword.value,
      fromEmail: smtpConfig.value.fromEmail,
      secureMode: smtpConfig.value.secureMode,
    });
    smtpPassword.value = "";
    settingsMessage.value = "邮件配置已保存。";
  } catch {
    settingsError.value = "邮件配置保存失败。";
  } finally {
    settingsBusy.value = false;
  }
}

async function clearSmtpSettings() {
  settingsBusy.value = true;
  settingsMessage.value = "";
  settingsError.value = "";
  try {
    smtpConfig.value = await clearSmtpConfig();
    smtpPassword.value = "";
    settingsMessage.value = "邮件配置已清空。";
  } catch {
    settingsError.value = "邮件配置清空失败。";
  } finally {
    settingsBusy.value = false;
  }
}

async function sendSmtpTest() {
  settingsMessage.value = "";
  settingsError.value = "";
  try {
    await sendTestEmail({ recipientEmail: smtpTestEmail.value });
    settingsMessage.value = "测试邮件已发送。";
  } catch {
    settingsError.value = "测试邮件发送失败。";
  }
}

async function addManagedUser() {
  settingsMessage.value = "";
  settingsError.value = "";
  try {
    await createManagedUser({
      username: newUserUsername.value,
      displayName: newUserDisplayName.value,
      role: newUserRole.value,
      password: newUserPassword.value,
      confirmPassword: newUserConfirmPassword.value,
    });
    newUserUsername.value = "";
    newUserDisplayName.value = "";
    newUserPassword.value = "";
    newUserConfirmPassword.value = "";
    const result = await fetchManagedUsers();
    users.value = result.users;
    settingsMessage.value = "用户已创建。";
  } catch {
    settingsError.value = "用户创建失败。";
  }
}

async function disableUser(user: ManagedUserResponse) {
  settingsMessage.value = "";
  settingsError.value = "";
  try {
    await disableManagedUser({ userId: user.id });
    const result = await fetchManagedUsers();
    users.value = result.users;
    settingsMessage.value = "用户已停用。";
  } catch {
    settingsError.value = "用户停用失败。";
  }
}

watchEffect(() => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("runner-auth-mode", showAuthPage.value);
  if (showAuthPage.value) {
    cleanupAppMotion();
  } else {
    installAppMotion();
  }
});

onMounted(() => {
  syncActiveSectionFromHash();
  window.addEventListener("hashchange", handleSectionHashChange);
  void refreshSession();
  installAuthMotion();
});

onUnmounted(() => {
  cleanupAuthMotion();
  cleanupAppMotion();
  window.removeEventListener("hashchange", handleSectionHashChange);
  if (typeof document !== "undefined") {
    document.documentElement.classList.remove("runner-auth-mode");
  }
});
</script>

<template>
  <section v-if="showAuthPage" class="auth-page" aria-label="登录跑步瘦身助手">
    <div ref="authSceneRef" aria-hidden="true" class="auth-motion-scene" data-click="off">
      <span class="auth-runner" />
      <span class="auth-lane auth-lane--one" />
      <span class="auth-lane auth-lane--two" />
    </div>

    <div class="auth-card-shell">
      <section class="auth-card">
        <div class="auth-card__header">
          <h1 class="auth-brand auth-brand--login">跑步瘦身助手</h1>
          <p class="auth-description">使用账号进入自己的数据空间。</p>
          <p class="auth-default-account">默认账号：admin　默认密码：admin123456</p>
        </div>
        <form class="auth-form" @submit.prevent="submitAuth">
          <p v-if="pageError" class="auth-error">{{ pageError }}</p>
          <p v-if="authMessage" class="auth-error">{{ authMessage }}</p>
          <p v-if="loading && !pageError" class="auth-hint">正在检查登录状态，可以直接登录。</p>
          <label>
            用户名
            <input v-model="username" autocomplete="username" placeholder="请输入用户名" />
            <small>{{ fieldError(authErrors, "username", "请输入用户名。") }}</small>
          </label>
          <label>
            密码
            <input v-model="password" type="password" autocomplete="current-password" placeholder="请输入密码" />
            <small>{{ fieldError(authErrors, "password", "请输入密码。") }}</small>
          </label>
          <button type="submit" :disabled="authBusy">{{ authBusy ? "登录中" : "登录" }}</button>
        </form>
      </section>
    </div>

    <footer class="auth-footer">
      <p>Copyright © 2026 张治航</p>
      <p>经营性网站备案信息：苏ICP备2026044129号</p>
      <p>苏公网安备 32011202001787号</p>
    </footer>
  </section>

  <section v-else class="slimming-shell" aria-label="跑步瘦身助手">
    <div ref="appMotionRef" aria-hidden="true" class="home-motion-field">
      <span class="home-motion-field__wake home-motion-field__wake--one" />
      <span class="home-motion-field__wake home-motion-field__wake--two" />
      <span class="home-motion-field__marker" />
    </div>

    <header class="runner-top-nav">
      <div class="runner-brand" aria-label="跑步瘦身助手">
        <span class="runner-brand-mark" aria-hidden="true"></span>
        <span>
          <strong>跑步瘦身助手</strong>
        </span>
      </div>
      <nav aria-label="跑步瘦身助手导航">
        <a href="#dashboard" :class="{ 'is-active': isActiveSection('dashboard') }" @click.prevent="setActiveSection('dashboard')">首页</a>
        <a href="#records" :class="{ 'is-active': isActiveSection('records') }" @click.prevent="setActiveSection('records')">打卡</a>
        <a href="#data" :class="{ 'is-active': isActiveSection('data') }" @click.prevent="setActiveSection('data')">数据</a>
        <a href="#history" :class="{ 'is-active': isActiveSection('history') }" @click.prevent="setActiveSection('history')">历史</a>
        <a href="#settings" :class="{ 'is-active': isActiveSection('settings') }" @click.prevent="setActiveSection('settings')">设置</a>
      </nav>
    </header>

    <section v-if="activeSection === 'dashboard'" id="dashboard" class="slimming-hero">
      <div>
        <p class="eyebrow">首页</p>
        <h1>跑步瘦身助手</h1>
        <p>把每日身体变化和跑步训练记录在同一个地方，按周查看目标完成情况。</p>
      </div>
      <div class="session-panel" aria-live="polite">
        <span v-if="loading">正在连接后端服务</span>
        <span v-else-if="pageError">{{ pageError }}</span>
        <template v-else-if="authenticated && currentUser">
          <strong>{{ currentUser.displayName || currentUser.username }}</strong>
          <span>{{ currentUser.role === "admin" ? "管理员" : "普通用户" }}</span>
          <button type="button" class="ghost-button" @click="submitLogout">退出</button>
        </template>
        <span v-else>未登录</span>
      </div>
    </section>

      <section v-if="activeSection === 'dashboard'" class="stat-grid" aria-label="首页指标">
        <article
          v-for="card in dashboardCards"
          :key="card.title"
          class="stat-card"
          :class="[`stat-card--${card.tone}`, `stat-card--${card.state}`]"
          role="button"
          tabindex="0"
          @click="setActiveSection(card.section)"
          @keydown="handleCardKeydown($event, card.section)"
        >
          <div class="stat-card__head">
            <span class="stat-card__icon">{{ card.title.slice(0, 1) }}</span>
            <span class="stat-card__action">{{ card.action }}</span>
          </div>
          <h2>{{ card.title }}</h2>
          <strong>{{ card.value }}</strong>
          <p>{{ card.detail }}</p>
        </article>
      </section>
      <p v-if="activeSection === 'dashboard' && summaryError" class="form-message">{{ summaryError }}</p>

      <section v-if="activeSection === 'records'" id="records" class="two-column">
        <article class="work-card">
          <div class="card-heading">
            <p class="eyebrow">打卡</p>
            <h2>{{ editingHealthId ? "编辑健康记录" : "健康记录" }}</h2>
          </div>
          <form class="form-grid" @submit.prevent="submitHealthRecord">
            <label>日期<input v-model="healthLocalDate" type="date" /></label>
            <label>体重（公斤）<input v-model="healthWeightKg" inputmode="decimal" /></label>
            <label>腰围（厘米）<input v-model="healthWaistCm" inputmode="decimal" /></label>
            <label>臀围（厘米）<input v-model="healthHipCm" inputmode="decimal" /></label>
            <label>体脂率（百分比）<input v-model="healthBodyFatPercentage" inputmode="decimal" /></label>
            <small>{{ fieldError(recordErrors, "localDate", "请选择日期。") }}</small>
            <div class="button-row">
              <button type="submit" :disabled="recordBusy">{{ editingHealthId ? "更新健康记录" : "保存健康记录" }}</button>
              <button v-if="editingHealthId" type="button" class="ghost-button" @click="resetHealthForm">取消编辑</button>
            </div>
          </form>
        </article>

        <article class="work-card">
          <div class="card-heading">
            <p class="eyebrow">打卡</p>
            <h2>{{ editingRunId ? "编辑跑步记录" : "跑步记录" }}</h2>
          </div>
          <form class="form-grid" @submit.prevent="submitRunRecord">
            <label>日期<input v-model="runLocalDate" type="date" /></label>
            <label>距离（公里）<input v-model="runDistanceKm" inputmode="decimal" /></label>
            <label>时长（分钟）<input v-model="runDurationMinutes" inputmode="decimal" /></label>
            <label>平均心率<input v-model="runAverageHeartRateBpm" inputmode="numeric" /></label>
            <label>平均步幅（米）<input v-model="runAverageStrideMeters" inputmode="decimal" /></label>
            <label>步频<input v-model="runCadenceSpm" inputmode="numeric" /></label>
            <div class="button-row">
              <button type="submit" :disabled="recordBusy">{{ editingRunId ? "更新跑步记录" : "保存跑步记录" }}</button>
              <button v-if="editingRunId" type="button" class="ghost-button" @click="resetRunForm">取消编辑</button>
            </div>
          </form>
        </article>
      </section>
      <p v-if="activeSection === 'records' && recordMessage" class="form-message">{{ recordMessage }}</p>

      <section v-if="activeSection === 'data'" id="data" class="work-card">
        <div class="card-heading">
          <p class="eyebrow">数据</p>
          <h2>数据看板</h2>
        </div>
        <div class="data-summary-grid" aria-label="数据摘要">
          <article v-for="card in dataSummaryCards" :key="card.title" class="data-summary-card">
            <span>{{ card.title }}</span>
            <strong>{{ card.value }}</strong>
            <p>{{ card.detail }}</p>
          </article>
        </div>
        <div class="card-heading compact-heading">
          <p class="eyebrow">目标进度</p>
          <h2>阶段目标</h2>
        </div>
        <form class="form-grid goal-grid" @submit.prevent="submitGoals">
          <label>目标体重（公斤）<input v-model="targetWeightKg" inputmode="decimal" /></label>
          <label>目标腰围（厘米）<input v-model="targetWaistCm" inputmode="decimal" /></label>
          <label>目标臀围（厘米）<input v-model="targetHipCm" inputmode="decimal" /></label>
          <label>目标体脂率（百分比）<input v-model="targetBodyFatPercentage" inputmode="decimal" /></label>
          <label>每周跑步次数<input v-model="weeklyRunCount" inputmode="numeric" /></label>
          <label>每周跑步距离（公里）<input v-model="weeklyDistanceKm" inputmode="decimal" /></label>
          <small>{{ fieldError(goalErrors, "weeklyDistanceKm", "请填写有效距离。") }}</small>
          <button type="submit" :disabled="goalBusy">{{ goalBusy ? "保存中" : "保存目标" }}</button>
        </form>
        <p v-if="goalMessage" class="form-message">{{ goalMessage }}</p>
      </section>

      <section v-if="activeSection === 'history'" id="history" class="work-card">
        <div class="card-heading history-heading">
          <div>
            <p class="eyebrow">历史</p>
            <h2>历史记录</h2>
          </div>
          <form class="filter-row" @submit.prevent="loadHistory">
            <select v-model="historyType" aria-label="记录类型">
              <option value="all">全部记录</option>
              <option value="health">健康记录</option>
              <option value="run">跑步记录</option>
            </select>
            <select v-model="historyRange" aria-label="时间范围">
              <option value="last30">最近三十天</option>
              <option value="last7">最近七天</option>
              <option value="all">全部时间</option>
              <option value="custom">自定义</option>
            </select>
            <input v-if="historyRange === 'custom'" v-model="historyStartDate" type="date" aria-label="开始日期" />
            <input v-if="historyRange === 'custom'" v-model="historyEndDate" type="date" aria-label="结束日期" />
            <button type="submit" :disabled="historyBusy">{{ historyBusy ? "查询中" : "查询" }}</button>
          </form>
        </div>
        <p v-if="historyError" class="form-message">{{ historyError }}</p>
        <p v-if="historyMessage" class="form-message">{{ historyMessage }}</p>
        <div class="history-list">
          <article v-for="entry in historyEntries" :key="entry.id" class="history-item">
            <div>
              <span>{{ entry.kind === "health" ? "健康" : "跑步" }}</span>
              <strong>{{ entry.localDate }}</strong>
              <p v-if="entry.kind === 'health' && entry.health">
                体重 {{ formatNumber(entry.health.weightKg) }} 公斤，腰围 {{ formatNumber(entry.health.waistCm) }} 厘米
              </p>
              <p v-else-if="entry.run">
                距离 {{ formatNumber(entry.run.distanceKm) }} 公里，时长 {{ minutesFromSeconds(entry.run.durationSeconds) || "未记录" }} 分钟
              </p>
            </div>
            <div class="button-row compact">
              <button type="button" class="ghost-button" @click="editEntry(entry)">编辑</button>
              <button type="button" class="ghost-button danger" @click="removeEntry(entry)">删除</button>
            </div>
          </article>
          <p v-if="!historyBusy && historyEntries.length === 0" class="empty-state">暂无记录。</p>
        </div>
      </section>

      <section v-if="activeSection === 'settings'" id="settings" class="two-column settings-grid">
        <article class="work-card">
          <div class="card-heading">
            <p class="eyebrow">设置</p>
            <h2>个人设置</h2>
          </div>
          <form class="form-grid" @submit.prevent="saveUserSettings">
            <label>昵称<input v-model="profileNickname" /></label>
            <label>身高（厘米）<input v-model="profileHeightCm" inputmode="decimal" /></label>
            <label>提醒邮箱<input v-model="profileReminderEmail" type="email" /></label>
            <label>提醒时间<input v-model="reminderRules.reminderTime" type="time" /></label>
            <label class="check-row"><input v-model="reminderRules.inAppEnabled" type="checkbox" />站内提醒</label>
            <label class="check-row"><input v-model="reminderRules.emailEnabled" type="checkbox" />邮件提醒</label>
            <button type="submit" :disabled="settingsBusy">{{ settingsBusy ? "保存中" : "保存设置" }}</button>
          </form>
        </article>

        <article class="work-card">
          <div class="card-heading">
            <p class="eyebrow">提醒</p>
            <h2>提醒状态</h2>
          </div>
          <div class="status-box">
            <strong>{{ latestEmailReminder ? reminderStatusText(latestEmailReminder.status) : "暂无邮件提醒" }}</strong>
            <p>{{ latestEmailReminder ? reminderMessageText(latestEmailReminder.status) : "当前还没有邮件提醒记录。" }}</p>
          </div>
          <div class="button-row action-row">
            <button type="button" @click="runReminderNow">立即检查提醒</button>
          </div>
          <p v-if="reminderRunMessage" class="form-message">{{ reminderRunMessage }}</p>
        </article>

        <article v-if="isAdmin" class="work-card">
          <div class="card-heading">
            <p class="eyebrow">邮件</p>
            <h2>邮件服务器配置</h2>
          </div>
          <form class="form-grid" @submit.prevent="saveSmtpSettings">
            <label>服务器地址<input v-model="smtpConfig.host" /></label>
            <label>端口<input v-model="smtpConfig.port" inputmode="numeric" /></label>
            <label>账号<input v-model="smtpConfig.username" /></label>
            <label>发件邮箱<input v-model="smtpConfig.fromEmail" type="email" /></label>
            <label>密码<input v-model="smtpPassword" type="password" :placeholder="smtpConfig.passwordConfigured ? '已配置，留空则不修改' : ''" /></label>
            <label>
              加密方式
              <select v-model="smtpConfig.secureMode">
                <option value="none">不加密</option>
                <option value="ssl">安全套接层</option>
                <option value="starttls">传输层安全</option>
              </select>
            </label>
            <div class="button-row">
              <button type="submit" :disabled="settingsBusy">保存邮件配置</button>
              <button type="button" class="ghost-button danger" @click="clearSmtpSettings">清空配置</button>
            </div>
          </form>
          <form class="form-grid inline-form" @submit.prevent="sendSmtpTest">
            <label>测试收件邮箱<input v-model="smtpTestEmail" type="email" /></label>
            <button type="submit">发送测试邮件</button>
          </form>
        </article>

        <article v-if="isAdmin" class="work-card">
          <div class="card-heading">
            <p class="eyebrow">账号</p>
            <h2>用户管理</h2>
          </div>
          <form class="form-grid" @submit.prevent="addManagedUser">
            <label>账号<input v-model="newUserUsername" /></label>
            <label>昵称<input v-model="newUserDisplayName" /></label>
            <label>
              角色
              <select v-model="newUserRole">
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </label>
            <label>密码<input v-model="newUserPassword" type="password" /></label>
            <label>确认密码<input v-model="newUserConfirmPassword" type="password" /></label>
            <button type="submit">创建用户</button>
          </form>
          <div class="user-list">
            <article v-for="user in users" :key="user.id" class="user-row">
              <div>
                <strong>{{ user.displayName || user.username }}</strong>
                <span>{{ user.role === "admin" ? "管理员" : "普通用户" }} · {{ user.disabledAtIso ? "已停用" : "可使用" }}</span>
              </div>
              <button v-if="!user.disabledAtIso" type="button" class="ghost-button danger" @click="disableUser(user)">停用</button>
            </article>
          </div>
        </article>
      </section>
      <p v-if="activeSection === 'settings' && settingsError" class="form-message">{{ settingsError }}</p>
      <p v-if="activeSection === 'settings' && settingsMessage" class="form-message">{{ settingsMessage }}</p>
      <footer class="runner-footer">
        <p>Copyright © 2026 张治航</p>
        <p>经营性网站备案信息：苏ICP备2026044129号</p>
        <p>苏公网安备 32011202001787号</p>
      </footer>
      <button
        v-if="previousSection"
        type="button"
        class="page-turn-zone page-turn-zone--left"
        :aria-label="`切换到${sectionLabels[previousSection]}`"
        @click="setActiveSection(previousSection)"
      >
        <span class="page-turn-button" aria-hidden="true">‹</span>
      </button>
      <button
        v-if="nextSection"
        type="button"
        class="page-turn-zone page-turn-zone--right"
        :aria-label="`切换到${sectionLabels[nextSection]}`"
        @click="setActiveSection(nextSection)"
      >
        <span class="page-turn-button" aria-hidden="true">›</span>
      </button>
  </section>
</template>

<style scoped>
.auth-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 18px;
  place-items: center;
  overflow: hidden;
  background:
    linear-gradient(115deg, rgba(247, 249, 255, 0.88), rgba(221, 236, 249, 0.74)),
    #eef5fb;
  padding: 28px 16px;
}

.auth-page::before {
  position: absolute;
  inset: -18%;
  background:
    linear-gradient(118deg, rgba(47, 109, 179, 0.2) 0 12%, transparent 12% 28%, rgba(35, 122, 87, 0.14) 28% 38%, transparent 38%),
    linear-gradient(155deg, transparent 0 42%, rgba(4, 30, 66, 0.08) 42% 48%, transparent 48%),
    repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.28) 0 2px, transparent 2px 58px);
  content: "";
  transform: translate3d(0, 0, 0) scale(1.04);
  animation: auth-scene-drift 18s ease-in-out infinite alternate;
}

.auth-page::after {
  position: absolute;
  inset: auto -18% 0;
  height: 42%;
  background:
    repeating-linear-gradient(12deg, rgba(47, 109, 179, 0.18) 0 2px, transparent 2px 38px),
    linear-gradient(180deg, transparent, rgba(47, 109, 179, 0.12));
  content: "";
  opacity: 0.62;
  transform: skewY(-7deg) translateY(18%);
  animation: auth-track-flow 14s linear infinite;
}

.auth-motion-scene {
  --auth-pointer-x: 68%;
  --auth-pointer-y: 38%;
  --auth-click-x: 68%;
  --auth-click-y: 38%;
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.auth-motion-scene::before,
.auth-motion-scene::after {
  position: absolute;
  display: block;
  content: "";
  pointer-events: none;
}

.auth-motion-scene::before {
  left: var(--auth-pointer-x);
  top: var(--auth-pointer-y);
  width: min(820px, 72vw);
  height: 132px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(47, 109, 179, 0.16), rgba(35, 122, 87, 0.09), transparent);
  filter: blur(10px);
  opacity: 0.74;
  transform: translate(-50%, -50%) rotate(-13deg);
}

.auth-motion-scene::after {
  left: var(--auth-click-x);
  top: var(--auth-click-y);
  width: 48px;
  height: 48px;
  border: 2px solid rgba(47, 109, 179, 0.28);
  border-radius: 999px;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.35);
}

.auth-motion-scene[data-click="on"]::after {
  animation: auth-click-ripple 560ms ease-out both;
}

.auth-lane,
.auth-runner {
  position: absolute;
  display: block;
}

.auth-lane {
  left: 8%;
  right: 8%;
  height: 2px;
  background:
    linear-gradient(90deg, transparent, rgba(4, 30, 66, 0.16), transparent),
    repeating-linear-gradient(90deg, rgba(47, 109, 179, 0.22) 0 18px, transparent 18px 52px);
  transform: rotate(-10deg);
}

.auth-lane--one {
  top: 30%;
  animation: auth-lane-slide 10s linear infinite;
}

.auth-lane--two {
  bottom: 26%;
  animation: auth-lane-slide 12s linear infinite reverse;
}

.auth-runner {
  right: 18%;
  top: 22%;
  width: 190px;
  height: 190px;
  border-radius: 40% 60% 48% 52%;
  background:
    linear-gradient(130deg, transparent 0 36%, rgba(4, 30, 66, 0.16) 37% 41%, transparent 42%),
    linear-gradient(45deg, transparent 0 44%, rgba(47, 109, 179, 0.2) 45% 50%, transparent 51%),
    rgba(47, 109, 179, 0.08);
  box-shadow: 0 28px 70px rgba(47, 109, 179, 0.16);
  animation: auth-runner-pulse 3.8s ease-in-out infinite;
}

.auth-card-shell {
  position: relative;
  z-index: 1;
  width: min(100%, 480px);
  display: grid;
  place-items: center;
}

.auth-card {
  width: 100%;
  border: 1px solid rgba(47, 109, 179, 0.18);
  border-radius: 8px;
  background: rgba(247, 249, 255, 0.88);
  padding: 30px;
  box-shadow:
    0 28px 90px rgba(4, 30, 66, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(18px);
}

.auth-card__header {
  margin-bottom: 22px;
  text-align: center;
}

.auth-brand {
  margin: 0;
  color: #041e42;
  font-size: 34px;
  font-weight: 950;
  line-height: 1.08;
}

.auth-description,
.auth-default-account {
  margin: 10px 0 0;
  color: #5e7288;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.55;
}

.auth-default-account {
  color: #2f6db3;
  font-size: 13px;
  font-weight: 900;
}

.auth-form {
  display: grid;
  gap: 16px;
}

.auth-error {
  margin: 0;
  border: 1px solid rgba(180, 35, 24, 0.18);
  border-radius: 8px;
  background: rgba(180, 35, 24, 0.08);
  color: #b42318;
  padding: 9px 12px;
  font-weight: 800;
}

.auth-hint {
  margin: 0;
  border: 1px solid rgba(47, 109, 179, 0.14);
  border-radius: 8px;
  background: rgba(47, 109, 179, 0.07);
  color: #5e7288;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 800;
}

.auth-footer {
  position: relative;
  z-index: 1;
  width: min(100%, 720px);
  color: rgba(4, 30, 66, 0.48);
  font-size: 12px;
  text-align: center;
}

.auth-footer p {
  margin: 4px 0;
}

.slimming-shell {
  position: relative;
  isolation: isolate;
  display: grid;
  gap: 18px;
}

.slimming-shell > :not(.home-motion-field) {
  position: relative;
  z-index: 1;
}

.home-motion-field {
  --home-pointer-x: 50%;
  --home-pointer-y: 42%;
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.home-motion-field::before,
.home-motion-field::after,
.home-motion-field__wake,
.home-motion-field__marker {
  position: absolute;
  display: block;
  content: "";
  pointer-events: none;
}

.home-motion-field::before {
  inset: 0;
  background:
    linear-gradient(115deg, transparent 0 18%, rgba(47, 109, 179, 0.08) 18% 20%, transparent 20% 48%, rgba(35, 122, 87, 0.06) 48% 50%, transparent 50%),
    repeating-linear-gradient(112deg, rgba(47, 109, 179, 0.055) 0 1px, transparent 1px 54px);
  mask-image: radial-gradient(720px 360px at var(--home-pointer-x) var(--home-pointer-y), #000 0 44%, transparent 82%);
  opacity: 0.86;
}

.home-motion-field::after {
  left: -8vw;
  right: -8vw;
  bottom: -3vh;
  height: 48vh;
  background:
    repeating-linear-gradient(9deg, rgba(47, 109, 179, 0.17) 0 2px, transparent 2px 38px),
    linear-gradient(180deg, transparent, rgba(47, 109, 179, 0.085));
  opacity: 0.42;
  transform: skewY(-5deg);
  animation: home-track-drift 18s linear infinite;
}

.home-motion-field__wake {
  left: var(--home-pointer-x);
  top: var(--home-pointer-y);
  width: min(980px, 82vw);
  height: 128px;
  border-radius: 999px;
  background:
    repeating-linear-gradient(90deg, transparent 0 28px, rgba(47, 109, 179, 0.09) 28px 30px, transparent 30px 76px),
    linear-gradient(90deg, transparent, rgba(47, 109, 179, 0.13), rgba(35, 122, 87, 0.08), transparent);
  filter: blur(12px);
  opacity: 0.7;
  transform: translate(-50%, -50%) rotate(-13deg);
}

.home-motion-field__wake--two {
  width: min(520px, 58vw);
  height: 72px;
  background: linear-gradient(90deg, transparent, rgba(4, 30, 66, 0.08), transparent);
  opacity: 0.38;
  transform: translate(-54%, -46%) rotate(10deg);
}

.home-motion-field__marker {
  left: var(--home-pointer-x);
  top: var(--home-pointer-y);
  width: 180px;
  height: 3px;
  background:
    repeating-linear-gradient(90deg, rgba(47, 109, 179, 0.38) 0 22px, transparent 22px 42px),
    linear-gradient(90deg, transparent, rgba(47, 109, 179, 0.34), transparent);
  opacity: 0.68;
  transform: translate(-50%, -50%) rotate(-13deg);
}

.runner-top-nav nav a.is-active {
  background: rgba(47, 109, 179, 0.15);
  color: #041e42;
  box-shadow: inset 0 0 0 1px rgba(47, 109, 179, 0.14);
}

.slimming-hero,
.auth-card,
.work-card,
.stat-card {
  border: 1px solid rgba(139, 165, 190, 0.28);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 18px 42px rgba(4, 30, 66, 0.07);
}

.work-card,
.data-summary-card,
.history-item,
.user-row {
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.work-card:hover,
.data-summary-card:hover,
.history-item:hover,
.user-row:hover {
  border-color: rgba(47, 109, 179, 0.24);
  box-shadow: 0 18px 42px rgba(4, 30, 66, 0.1);
}

.slimming-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #2f6db3;
  font-size: 13px;
  font-weight: 900;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: clamp(32px, 4vw, 46px);
  line-height: 1.05;
}

h2 {
  font-size: 22px;
}

.slimming-hero p:not(.eyebrow),
.auth-card p,
.stat-card p,
.history-item p,
.status-box p,
.form-message,
.empty-state {
  color: #5e7288;
  font-weight: 650;
  line-height: 1.65;
}

.session-panel {
  min-width: 220px;
  display: grid;
  gap: 6px;
  justify-items: end;
  color: #5e7288;
  font-weight: 800;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.stat-card--checkin {
  grid-column: 1 / -1;
}

.stat-card {
  min-height: 208px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  padding: 24px;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    filter 180ms ease,
    transform 180ms ease;
}

.stat-card:hover,
.stat-card:focus-visible {
  border-color: rgba(47, 109, 179, 0.28);
  box-shadow: 0 24px 52px rgba(4, 30, 66, 0.12), 0 0 0 1px rgba(47, 109, 179, 0.08);
  filter: saturate(1.04);
}

.stat-card:active {
  transform: scale(0.99);
}

.stat-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.stat-card__icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(47, 109, 179, 0.08);
  color: #041e42;
  font-size: 15px;
  font-weight: 950;
  box-shadow: inset 0 0 0 1px rgba(4, 30, 66, 0.12);
}

.stat-card__action {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(47, 109, 179, 0.08);
  padding: 0 10px;
  color: #041e42;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.stat-card h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 950;
}

.history-item span,
.user-row span {
  color: #5e7288;
  font-size: 13px;
  font-weight: 850;
}

.stat-card strong {
  color: #041e42;
  font-size: 42px;
  line-height: 1;
}

.stat-card--health-goal.stat-card--unset,
.stat-card--motion-goal.stat-card--unset {
  background: linear-gradient(135deg, rgba(86, 108, 135, 0.11), rgba(247, 249, 255, 0.98) 62%);
  border-color: rgba(86, 108, 135, 0.24);
  box-shadow:
    inset 4px 0 0 rgba(86, 108, 135, 0.36),
    0 18px 42px rgba(4, 30, 66, 0.08);
}

.stat-card--health-goal.stat-card--active {
  background: linear-gradient(135deg, rgba(35, 122, 87, 0.14), rgba(247, 249, 255, 0.98) 64%);
  border-color: rgba(35, 122, 87, 0.34);
  box-shadow:
    inset 4px 0 0 rgba(35, 122, 87, 0.5),
    0 18px 42px rgba(35, 122, 87, 0.09);
}

.stat-card--motion-goal.stat-card--active,
.stat-card--week,
.stat-card--total {
  background: linear-gradient(135deg, rgba(47, 109, 179, 0.12), rgba(247, 249, 255, 0.98) 64%);
  border-color: rgba(47, 109, 179, 0.24);
}

.stat-card--checkin.stat-card--missing {
  background: linear-gradient(135deg, rgba(180, 35, 24, 0.11), rgba(247, 249, 255, 0.98) 64%);
  border-color: rgba(180, 35, 24, 0.34);
}

.stat-card--checkin.stat-card--done {
  background: linear-gradient(135deg, rgba(35, 122, 87, 0.13), rgba(247, 249, 255, 0.98) 64%);
  border-color: rgba(35, 122, 87, 0.34);
}

.auth-card,
.work-card {
  padding: 24px;
}

.auth-card {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(280px, 1.2fr);
  gap: 24px;
}

.two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.settings-grid {
  align-items: start;
}

.settings-grid .work-card {
  min-height: 0;
}

.settings-grid .card-heading {
  align-items: flex-start;
}

.settings-grid .card-heading h2 {
  text-align: left;
}

.settings-grid .form-grid > button,
.settings-grid .inline-form > button {
  margin-top: 4px;
}

.settings-grid .button-row {
  grid-column: 1 / -1;
}

.settings-grid .button-row button {
  min-width: 148px;
}

.card-heading,
.history-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.compact-heading {
  margin-top: 22px;
}

.data-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 8px;
}

.data-summary-card {
  display: grid;
  gap: 8px;
  border: 1px solid rgba(139, 165, 190, 0.24);
  border-radius: 8px;
  background: rgba(238, 244, 248, 0.55);
  padding: 14px;
}

.data-summary-card span {
  color: #5e7288;
  font-size: 13px;
  font-weight: 850;
}

.data-summary-card strong {
  color: #041e42;
  font-size: 22px;
}

.data-summary-card p {
  margin: 0;
  color: #5e7288;
  font-size: 13px;
  font-weight: 700;
}

.form-grid,
.filter-row {
  display: grid;
  gap: 12px;
}

.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.goal-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

label {
  display: grid;
  gap: 6px;
  color: #041e42;
  font-size: 13px;
  font-weight: 850;
}

input,
select {
  width: 100%;
  min-height: 44px;
  border: 1px solid rgba(139, 165, 190, 0.5);
  border-radius: 8px;
  background: #ffffff;
  color: #041e42;
  font: inherit;
  font-weight: 750;
  padding: 0 12px;
}

input:focus,
select:focus {
  border-color: rgba(47, 109, 179, 0.42);
  box-shadow: 0 0 0 3px rgba(47, 109, 179, 0.12);
  outline: none;
}

small {
  min-height: 18px;
  color: #b42318;
  font-weight: 800;
}

button {
  --button-width: auto;
  width: var(--button-width);
  min-width: 148px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: #2f6db3;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 900;
  line-height: 1;
  padding: 0 16px;
  white-space: nowrap;
  box-shadow: 0 12px 28px rgba(47, 109, 179, 0.18);
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

button:hover {
  background: #285f9d;
  box-shadow: 0 16px 34px rgba(47, 109, 179, 0.24);
}

button:active {
  transform: scale(0.98);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.ghost-button {
  border: 1px solid rgba(47, 109, 179, 0.24);
  background: rgba(47, 109, 179, 0.08);
  color: #2f6db3;
  box-shadow: none;
}

.ghost-button:hover {
  background: rgba(47, 109, 179, 0.14);
  box-shadow: 0 10px 24px rgba(47, 109, 179, 0.1);
}

.danger {
  border-color: rgba(180, 35, 24, 0.22);
  background: rgba(180, 35, 24, 0.08);
  color: #b42318;
}

.danger:hover {
  border-color: rgba(180, 35, 24, 0.34);
  background: rgba(180, 35, 24, 0.12);
  color: #9f1f15;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.button-row button {
  flex: 0 0 auto;
}

.form-grid > button,
.inline-form > button {
  justify-self: start;
}

.auth-form > button {
  width: 100%;
}

.page-turn-zone {
  position: fixed;
  top: 96px;
  bottom: 0;
  z-index: 20;
  width: clamp(64px, 7vw, 112px);
  min-height: 0;
  display: none;
  align-items: center;
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
  pointer-events: auto;
  cursor: pointer;
}

.page-turn-zone:hover {
  background: transparent;
  box-shadow: none;
}

.page-turn-zone:active {
  transform: none;
}

.page-turn-zone--left {
  left: 0;
  justify-content: flex-start;
  padding-left: clamp(28px, 4vw, 72px);
}

.page-turn-zone--right {
  right: 0;
  justify-content: flex-end;
  padding-right: clamp(28px, 4vw, 72px);
}

.page-turn-button {
  width: 54px;
  height: 74px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(4, 30, 66, 0.12);
  border-radius: 999px;
  background: rgba(247, 249, 255, 0.94);
  color: #041e42;
  box-shadow: 0 18px 44px rgba(4, 30, 66, 0.12);
  opacity: 0;
  transform: translateX(0) scale(0.94);
  transition:
    opacity 180ms ease,
    transform 180ms ease,
    background-color 180ms ease,
    color 180ms ease;
  pointer-events: none;
  font-size: 42px;
  font-weight: 700;
  line-height: 1;
}

.page-turn-zone:hover .page-turn-button,
.page-turn-zone:focus-visible .page-turn-button {
  opacity: 1;
  transform: scale(1);
  background: #2f6db3;
  color: #f7f9ff;
}

.compact {
  justify-content: flex-end;
}

.filter-row {
  grid-template-columns: repeat(4, minmax(120px, auto));
  align-items: end;
}

.history-list,
.user-list {
  display: grid;
  gap: 10px;
}

.history-item,
.user-row,
.status-box {
  border: 1px solid rgba(139, 165, 190, 0.24);
  border-radius: 8px;
  background: rgba(238, 244, 248, 0.55);
  padding: 14px;
}

.history-item,
.user-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.history-item > div:first-child,
.user-row > div:first-child {
  display: grid;
  gap: 4px;
}

.check-row {
  grid-template-columns: 18px 1fr;
  align-items: center;
}

.check-row input {
  min-height: auto;
}

.form-message,
.empty-state {
  grid-column: 1 / -1;
  margin-top: 8px;
}

.inline-form {
  margin-top: 12px;
}

@media (max-width: 980px) {
  .slimming-hero,
  .auth-card,
  .two-column {
    grid-template-columns: 1fr;
  }

  .slimming-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .session-panel {
    justify-items: start;
  }

  .stat-grid,
  .data-summary-grid,
  .goal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (hover: hover) and (pointer: fine) {
  .page-turn-zone {
    display: flex;
  }
}

@media (max-width: 680px) {
  .slimming-hero,
  .auth-card,
  .work-card {
    padding: 18px;
  }

  .stat-grid,
  .data-summary-grid,
  .form-grid,
  .goal-grid,
  .filter-row {
    grid-template-columns: 1fr;
  }

  .card-heading,
  .history-heading,
  .history-item,
  .user-row {
    flex-direction: column;
  }
}

@keyframes auth-scene-drift {
  from {
    transform: translate3d(-1.5%, -1%, 0) scale(1.04);
  }

  to {
    transform: translate3d(1.5%, 1%, 0) scale(1.08);
  }
}

@keyframes home-track-drift {
  from {
    background-position: 0 0, 0 0;
  }

  to {
    background-position: 280px 0, 0 0;
  }
}

@keyframes auth-track-flow {
  from {
    background-position: 0 0, 0 0;
  }

  to {
    background-position: 260px 0, 0 0;
  }
}

@keyframes auth-lane-slide {
  from {
    transform: translateX(-8%) rotate(-10deg);
  }

  to {
    transform: translateX(8%) rotate(-10deg);
  }
}

@keyframes auth-runner-pulse {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(-8deg) scale(1);
  }

  50% {
    transform: translate3d(-8px, 5px, 0) rotate(-5deg) scale(1.035);
  }
}

@keyframes auth-click-ripple {
  0% {
    opacity: 0.42;
    transform: translate(-50%, -50%) scale(0.35);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(4.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-page::before,
  .auth-page::after,
  .home-motion-field::after,
  .auth-lane,
  .auth-runner,
  .auth-motion-scene[data-click="on"]::after {
    animation: none;
  }
}
</style>
