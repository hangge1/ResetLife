import { AppShell } from "@/components/layout/app-shell";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { createRecordsRepository } from "@/features/records/repositories/records-repository";
import { HealthRecordForm } from "@/features/records/components/health-record-form";
import { RecordDatePicker } from "@/features/records/components/record-date-picker";
import { RunRecordForm } from "@/features/records/components/run-record-form";
import { healthRecordToFormValues } from "@/features/records/actions/health-record-form-state";
import { initialRunRecordFormState } from "@/features/records/actions/run-record-form-state";
import {
  getHealthRecordByDate,
  listRunRecordsByDate,
  validateLocalDate,
} from "@/features/records/services/records-service";
import { getTodayLocalDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type RecordsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function RecordsPage({ searchParams }: RecordsPageProps) {
  await requireTrustedDevice();

  const params = (await searchParams) ?? {};
  const todayLocalDate = getTodayLocalDate();
  const requestedDate = getStringParam(params, "date") ?? todayLocalDate;
  const dateValidation = validateLocalDate(requestedDate);
  const localDate = dateValidation.ok ? requestedDate : todayLocalDate;
  const repository = createRecordsRepository();
  const healthRecord = getHealthRecordByDate(repository, localDate);
  const runRecords = listRunRecordsByDate(repository, localDate);
  const healthRecordError =
    !healthRecord.ok && "error" in healthRecord ? healthRecord.error.message : "记录数据读取失败";
  const initialState = {
    values: healthRecordToFormValues(healthRecord.ok ? healthRecord.data : null),
    fieldErrors: healthRecord.ok ? {} : { form: healthRecordError },
  };
  const selectedHealthRecord = healthRecord.ok ? healthRecord.data : null;
  const todayRuns = runRecords.ok ? runRecords.data : [];

  return (
    <AppShell>
      <main className="workbench-main">
        <section className="workbench-hero">
          <p className="workbench-eyebrow">打卡工作台</p>
          <h1 className="workbench-title">今天的数据，今天留下证据</h1>
          <p className="workbench-description">
            跑步和健康分开记录；补录时只需要在卡片内切换日期。
          </p>
        </section>

        <div className="workbench-grid">

          {dateValidation.ok ? null : (
            <p className="m-0 rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              日期参数无效，已切换为今天
            </p>
          )}

          <section aria-label="记录表单" className="workbench-grid workbench-grid--two">
            <article className="workbench-card workbench-card--health">
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <h2 className="workbench-card-title">健康打卡</h2>
                  <RecordDatePicker id="healthRecordDate" localDate={localDate} />
                  <p className="workbench-card-text">提交体重、腰围和体脂率；同一天重复提交会覆盖当天健康打卡。</p>
                </div>
                <HealthRecordForm initialState={initialState} localDate={localDate} />

                <div className="border-t border-[var(--border-soft)] pt-4">
                  <p className="mb-3 text-sm font-semibold text-[var(--ink-primary)]">
                    {localDate === todayLocalDate ? "今日健康打卡" : "当日健康打卡"}
                  </p>
                  {selectedHealthRecord ? (
                    <div className="mini-metric-grid">
                      <div className="mini-metric">
                        <p className="mini-metric-label">体重</p>
                        <p className="mini-metric-value">{selectedHealthRecord.weightKg == null ? "未填" : `${selectedHealthRecord.weightKg} 公斤`}</p>
                      </div>
                      <div className="mini-metric">
                        <p className="mini-metric-label">腰围</p>
                        <p className="mini-metric-value">{selectedHealthRecord.waistCm == null ? "未填" : `${selectedHealthRecord.waistCm} 厘米`}</p>
                      </div>
                      <div className="mini-metric">
                        <p className="mini-metric-label">臀围</p>
                        <p className="mini-metric-value">{selectedHealthRecord.hipCm == null ? "未填" : `${selectedHealthRecord.hipCm} 厘米`}</p>
                      </div>
                      <div className="mini-metric">
                        <p className="mini-metric-label">体脂率</p>
                        <p className="mini-metric-value">{selectedHealthRecord.bodyFatPercentage == null ? "未填" : `${selectedHealthRecord.bodyFatPercentage}%`}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="m-0 text-sm text-[var(--ink-secondary)]">当前日期还没有健康打卡</p>
                  )}
                </div>
              </div>
            </article>

            <article className="workbench-card workbench-card--motion">
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <h2 className="workbench-card-title">跑步打卡</h2>
                  <RecordDatePicker id="runRecordDate" localDate={localDate} />
                  <p className="workbench-card-text">提交一次跑步数据；同一天可以保存多条跑步打卡。</p>
                </div>
                <RunRecordForm initialState={initialRunRecordFormState} localDate={localDate} />

                <div className="border-t border-[var(--border-soft)] pt-4">
                  <p className="mb-3 text-sm font-semibold text-[var(--ink-primary)]">
                    {localDate === todayLocalDate ? "今日跑步打卡" : "当日跑步打卡"}
                  </p>
                  {todayRuns.length > 0 ? (
                    <div className="grid gap-2">
                      {todayRuns.map((record) => (
                        <div
                          className="mini-metric-grid rounded-md border border-[var(--border-soft)] bg-white/60 p-3"
                          key={record.id}
                        >
                          <div>
                            <p className="mini-metric-label">距离</p>
                            <p className="mini-metric-value">{record.distanceKm} 公里</p>
                          </div>
                          <div>
                            <p className="mini-metric-label">时长</p>
                            <p className="mini-metric-value">{record.durationSeconds == null ? "未填" : `${Math.round(record.durationSeconds / 60)} 分钟`}</p>
                          </div>
                          <div>
                            <p className="mini-metric-label">配速</p>
                            <p className="mini-metric-value">{record.paceSecondsPerKm == null ? "未填" : `${Math.round((record.paceSecondsPerKm / 60) * 10) / 10} 分钟/公里`}</p>
                          </div>
                          <div>
                            <p className="mini-metric-label">心率</p>
                            <p className="mini-metric-value">{record.averageHeartRateBpm == null ? "未填" : `${record.averageHeartRateBpm} 次/分`}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="m-0 text-sm text-[var(--ink-secondary)]">当前日期还没有跑步打卡</p>
                  )}
                </div>
              </div>
            </article>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
