import type { HealthRecord, RunRecord } from "../../../db/schema.ts";
import type { createRecordsRepository } from "../repositories/records-repository.ts";

type RecordsRepository = ReturnType<typeof createRecordsRepository>;

export type HistoryRecordType = "all" | "health" | "run";
export type HistoryRange = "all" | "last7" | "last30" | "custom";

export type HistoryFilters = {
  type: HistoryRecordType;
  range: HistoryRange;
  todayLocalDate: string;
  startDate?: string;
  endDate?: string;
};

export type HistoryEntry = {
  id: string;
  kind: "health" | "run";
  localDate: string;
  createdAtIso: string;
  title: string;
  metrics: string[];
};

export type HistoryResult =
  | { ok: true; data: HistoryEntry[] }
  | { ok: false; error: { message: string } };

function formatDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(localDate: string, days: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function getRangeBounds(filters: HistoryFilters) {
  if (filters.range === "last7") {
    return { startDate: addDays(filters.todayLocalDate, -6), endDate: filters.todayLocalDate };
  }

  if (filters.range === "last30") {
    return { startDate: addDays(filters.todayLocalDate, -29), endDate: filters.todayLocalDate };
  }

  if (filters.range === "custom") {
    return { startDate: filters.startDate, endDate: filters.endDate };
  }

  return {};
}

function isInRange(localDate: string, filters: HistoryFilters) {
  const { startDate, endDate } = getRangeBounds(filters);

  if (startDate && localDate < startDate) {
    return false;
  }

  if (endDate && localDate > endDate) {
    return false;
  }

  return true;
}

function healthToHistoryEntry(record: HealthRecord): HistoryEntry {
  const metrics = [
    record.weightKg == null ? null : `体重 ${record.weightKg} 公斤`,
    record.waistCm == null ? null : `腰围 ${record.waistCm} 厘米`,
    record.hipCm == null ? null : `臀围 ${record.hipCm} 厘米`,
    record.bodyFatPercentage == null ? null : `体脂率 ${record.bodyFatPercentage}%`,
  ].filter((metric): metric is string => Boolean(metric));

  return {
    id: record.id,
    kind: "health",
    localDate: record.localDate,
    createdAtIso: record.createdAtIso,
    title: "健康记录",
    metrics,
  };
}

function runToHistoryEntry(record: RunRecord): HistoryEntry {
  const metrics = [
    `距离 ${record.distanceKm} 公里`,
    record.durationSeconds == null ? null : `时长 ${Math.round(record.durationSeconds / 60)} 分钟`,
    record.paceSecondsPerKm == null ? null : `配速 ${Math.round((record.paceSecondsPerKm / 60) * 10) / 10} 分钟/公里`,
    record.averageHeartRateBpm == null ? null : `平均心率 ${record.averageHeartRateBpm} 次/分`,
    record.averageStrideMeters == null ? null : `平均步幅 ${record.averageStrideMeters} 米`,
    record.cadenceSpm == null ? null : `步频 ${record.cadenceSpm} 步/分`,
  ].filter((metric): metric is string => Boolean(metric));

  return {
    id: record.id,
    kind: "run",
    localDate: record.localDate,
    createdAtIso: record.createdAtIso,
    title: "跑步记录",
    metrics,
  };
}

export function listHistoryRecords(repository: RecordsRepository, filters: HistoryFilters): HistoryResult {
  const health = repository.listHealthRecords();
  const runs = repository.listRunRecords();

  if (!health.ok || !runs.ok) {
    return { ok: false, error: { message: "历史记录读取失败" } };
  }

  const entries = [
    ...(filters.type === "run" ? [] : health.data.map(healthToHistoryEntry)),
    ...(filters.type === "health" ? [] : runs.data.map(runToHistoryEntry)),
  ]
    .filter((entry) => isInRange(entry.localDate, filters))
    .sort((left, right) => {
      if (left.localDate !== right.localDate) {
        return right.localDate.localeCompare(left.localDate);
      }

      return right.createdAtIso.localeCompare(left.createdAtIso);
    });

  return { ok: true, data: entries };
}
