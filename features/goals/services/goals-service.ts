import type {
  SaveHealthGoalInput,
  SaveRunGoalInput,
  createGoalsRepository,
} from "../repositories/goals-repository.ts";

type GoalsRepository = ReturnType<typeof createGoalsRepository>;

type HealthGoalFieldErrors = {
  targetWeightKg?: string;
  targetWaistCm?: string;
  targetHipCm?: string;
  targetBodyFatPercentage?: string;
  form?: string;
};

type RunGoalFieldErrors = {
  weeklyRunCount?: string;
  weeklyDistanceKm?: string;
  form?: string;
};

function isPositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function saveHealthGoal(repository: GoalsRepository, input: SaveHealthGoalInput) {
  const fieldErrors: HealthGoalFieldErrors = {};

  if (!isPositiveNumber(input.targetWeightKg)) {
    fieldErrors.targetWeightKg = "目标体重必须是大于 0 的数字";
  }

  if (input.targetWaistCm != null && !isPositiveNumber(input.targetWaistCm)) {
    fieldErrors.targetWaistCm = "目标腰围必须是大于 0 的数字";
  }

  if (input.targetHipCm != null && !isPositiveNumber(input.targetHipCm)) {
    fieldErrors.targetHipCm = "目标臀围必须是大于 0 的数字";
  }

  if (
    input.targetBodyFatPercentage != null &&
    (!Number.isFinite(input.targetBodyFatPercentage) ||
      input.targetBodyFatPercentage < 0 ||
      input.targetBodyFatPercentage > 100)
  ) {
    fieldErrors.targetBodyFatPercentage = "目标体脂率必须是 0 到 100 之间的数字";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false as const, fieldErrors };
  }

  return repository.saveHealthGoal(input);
}

export function saveRunGoal(repository: GoalsRepository, input: SaveRunGoalInput) {
  const fieldErrors: RunGoalFieldErrors = {};

  if (!Number.isInteger(input.weeklyRunCount) || input.weeklyRunCount <= 0) {
    fieldErrors.weeklyRunCount = "每周跑步次数必须是大于 0 的整数";
  }

  if (!isPositiveNumber(input.weeklyDistanceKm)) {
    fieldErrors.weeklyDistanceKm = "每周跑量必须是大于 0 的数字";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false as const, fieldErrors };
  }

  return repository.saveRunGoal(input);
}

export function getHealthGoal(repository: GoalsRepository) {
  return repository.getGoalByType("health");
}

export function getRunGoal(repository: GoalsRepository) {
  return repository.getGoalByType("run");
}
