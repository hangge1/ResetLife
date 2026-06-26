"use client";

import { useMemo, useState } from "react";
import type { DashboardChartMetric, DashboardChartPanel } from "../services/dashboard-summary";

type TrendLineChartProps = {
  panel: DashboardChartPanel;
};

type ChartPoint = DashboardChartMetric["points"][number] & {
  x: number;
  y: number;
};

const chartWidth = 640;
const chartHeight = 260;
const chartPadding = {
  top: 28,
  right: 24,
  bottom: 36,
  left: 56,
};

function toneColor(tone: DashboardChartMetric["tone"]) {
  if (tone === "health") {
    return "var(--health)";
  }

  if (tone === "motion") {
    return "var(--motion)";
  }

  return "var(--warning)";
}

function parseLocalDate(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatDateLabel(localDate: string) {
  return localDate.slice(5);
}

function formatAxisValue(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function buildDomain(values: number[], includeZero: boolean) {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = Math.max(1, rawMax - rawMin);
  const padding = span * 0.12;
  const min = includeZero ? Math.min(0, rawMin - padding) : rawMin - padding;
  const max = rawMax + padding;

  return min === max ? { min: min - 1, max: max + 1 } : { min, max };
}

function buildChart(metric: DashboardChartMetric) {
  if (metric.points.length === 0) {
    return {
      points: [] as ChartPoint[],
      path: "",
      axisLabels: [] as Array<{ label: string; y: number }>,
    };
  }

  const times = metric.points.map((point) => parseLocalDate(point.localDate));
  const values = metric.points.map((point) => point.value);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const includeZero = metric.label.includes("跑量") || metric.label.includes("次数");
  const domain = buildDomain(values, includeZero);
  const usableWidth = chartWidth - chartPadding.left - chartPadding.right;
  const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const points = metric.points.map((point) => {
    const time = parseLocalDate(point.localDate);
    const x =
      minTime === maxTime
        ? chartPadding.left + usableWidth / 2
        : chartPadding.left + ((time - minTime) / (maxTime - minTime)) * usableWidth;
    const y =
      chartPadding.top + ((domain.max - point.value) / (domain.max - domain.min)) * usableHeight;

    return {
      ...point,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const axisValues = [domain.max, (domain.max + domain.min) / 2, domain.min];
  const axisLabels = axisValues.map((value) => ({
    label: formatAxisValue(value),
    y: chartPadding.top + ((domain.max - value) / (domain.max - domain.min)) * usableHeight,
  }));

  return { points, path, axisLabels };
}

function tooltipX(point: ChartPoint) {
  return point.x > chartWidth - 170 ? point.x - 132 : point.x + 12;
}

function tooltipY(point: ChartPoint) {
  return Math.max(chartPadding.top, point.y - 44);
}

export function TrendLineChart({ panel }: TrendLineChartProps) {
  const [selectedLabel, setSelectedLabel] = useState(panel.metrics[0]?.label ?? "");
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null);
  const selectedMetric = panel.metrics.find((metric) => metric.label === selectedLabel) ?? panel.metrics[0];
  const color = selectedMetric ? toneColor(selectedMetric.tone) : "var(--primary)";
  const chart = useMemo(
    () => (selectedMetric ? buildChart(selectedMetric) : { points: [], path: "", axisLabels: [] }),
    [selectedMetric],
  );
  const firstPoint = chart.points[0];
  const latestPoint = chart.points[chart.points.length - 1];

  return (
    <article className="card p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="m-0 text-base font-semibold text-[var(--ink-primary)]">{panel.title}</h3>
          <p className="m-0 mt-1 text-sm text-[var(--ink-secondary)]">{panel.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--ink-secondary)]">
            {panel.periodLabel}
          </span>
          <label className="sr-only" htmlFor={`${panel.title}-metric`}>
            切换曲线指标
          </label>
          <select
            className="min-h-9 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm font-semibold text-[var(--ink-primary)]"
            id={`${panel.title}-metric`}
            onChange={(event) => {
              setSelectedLabel(event.target.value);
              setActivePoint(null);
            }}
            value={selectedMetric?.label ?? ""}
          >
            {panel.metrics.map((metric) => (
              <option key={metric.label} value={metric.label}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedMetric ? (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
            <p className="m-0 text-sm font-semibold text-[var(--ink-primary)]">{selectedMetric.label}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[32px] font-bold leading-none text-[var(--ink-primary)]">
                {selectedMetric.value}
              </span>
              {selectedMetric.unit ? (
                <span className="text-sm font-semibold text-[var(--ink-secondary)]">{selectedMetric.unit}</span>
              ) : null}
            </div>
            <p className="m-0 mt-2 text-sm text-[var(--ink-secondary)]">{selectedMetric.change}</p>
          </div>

          <div className="min-h-80 overflow-hidden rounded-md border border-[var(--border-soft)] bg-white p-3">
            {chart.path ? (
              <svg
                aria-label={`${panel.title}-${selectedMetric.label}曲线`}
                className="h-72 w-full"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              >
                {chart.axisLabels.map((axis) => (
                  <g key={axis.label}>
                    <line
                      stroke="var(--border-soft)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                      x1={chartPadding.left}
                      x2={chartWidth - chartPadding.right}
                      y1={axis.y}
                      y2={axis.y}
                    />
                    <text
                      fill="var(--ink-muted)"
                      fontSize="12"
                      textAnchor="end"
                      x={chartPadding.left - 10}
                      y={axis.y + 4}
                    >
                      {axis.label}
                    </text>
                  </g>
                ))}
                <line
                  stroke="var(--border-soft)"
                  strokeWidth="1"
                  x1={chartPadding.left}
                  x2={chartPadding.left}
                  y1={chartPadding.top}
                  y2={chartHeight - chartPadding.bottom}
                />
                <line
                  stroke="var(--border-soft)"
                  strokeWidth="1"
                  x1={chartPadding.left}
                  x2={chartWidth - chartPadding.right}
                  y1={chartHeight - chartPadding.bottom}
                  y2={chartHeight - chartPadding.bottom}
                />
                <path d={chart.path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                {chart.points.map((point) => (
                  <circle
                    aria-label={`${point.localDate}：${formatAxisValue(point.value)}${selectedMetric.unit}`}
                    cx={point.x}
                    cy={point.y}
                    fill={activePoint?.localDate === point.localDate ? color : "white"}
                    key={point.localDate}
                    onBlur={() => setActivePoint(null)}
                    onFocus={() => setActivePoint(point)}
                    onMouseEnter={() => setActivePoint(point)}
                    onMouseLeave={() => setActivePoint(null)}
                    r={activePoint?.localDate === point.localDate ? 6 : 4}
                    stroke={color}
                    strokeWidth="2"
                    tabIndex={0}
                  />
                ))}
                {activePoint ? (
                  <g pointerEvents="none">
                    <line
                      stroke={color}
                      strokeDasharray="3 3"
                      strokeWidth="1"
                      x1={activePoint.x}
                      x2={activePoint.x}
                      y1={chartPadding.top}
                      y2={chartHeight - chartPadding.bottom}
                    />
                    <rect
                      fill="var(--ink-primary)"
                      height="38"
                      rx="6"
                      width="120"
                      x={tooltipX(activePoint)}
                      y={tooltipY(activePoint)}
                    />
                    <text fill="white" fontSize="12" x={tooltipX(activePoint) + 10} y={tooltipY(activePoint) + 15}>
                      {activePoint.localDate}
                    </text>
                    <text fill="white" fontSize="12" fontWeight="700" x={tooltipX(activePoint) + 10} y={tooltipY(activePoint) + 31}>
                      {formatAxisValue(activePoint.value)} {selectedMetric.unit}
                    </text>
                  </g>
                ) : null}
                <text fill="var(--ink-muted)" fontSize="12" textAnchor="start" x={chartPadding.left} y={chartHeight - 10}>
                  {firstPoint ? formatDateLabel(firstPoint.localDate) : "--"}
                </text>
                <text fill="var(--ink-muted)" fontSize="12" textAnchor="end" x={chartWidth - chartPadding.right} y={chartHeight - 10}>
                  {latestPoint ? formatDateLabel(latestPoint.localDate) : "--"}
                </text>
              </svg>
            ) : (
              <div className="flex h-72 items-center justify-center px-4 text-center text-sm text-[var(--ink-secondary)]">
                暂无可绘制数据
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-72 items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-sm text-[var(--ink-secondary)]">
          暂无可绘制数据
        </div>
      )}
    </article>
  );
}
