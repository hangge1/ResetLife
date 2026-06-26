"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveTrendThresholdAction } from "../actions/save-trend-threshold";
import {
  initialTrendThresholdFormState,
  type TrendThresholdFormState,
} from "../actions/trend-threshold-form-state";

type TrendThresholdFormProps = {
  initialState: TrendThresholdFormState;
};

const fields = [
  { name: "minimumDays", label: "最低统计天数", unit: "天" },
  { name: "minimumRecords", label: "最低有效记录数", unit: "条" },
] as const;

export function TrendThresholdForm({ initialState }: TrendThresholdFormProps) {
  const [state, formAction, pending] = useActionState(saveTrendThresholdAction, initialState);
  const values = state?.values ?? initialState.values ?? initialTrendThresholdFormState.values;
  const fieldErrors = state?.fieldErrors ?? initialTrendThresholdFormState.fieldErrors;

  return (
    <form action={formAction} className="grid gap-4">
      {state?.successMessage ? (
        <p className="rounded-md border border-[var(--health)] bg-[var(--health-soft)] px-3 py-2 text-sm text-[var(--ink-primary)]">
          {state.successMessage}
        </p>
      ) : null}

      <div className="grid gap-3">
        {fields.map((field) => {
          const errorId = `${field.name}-error`;
          const error = fieldErrors[field.name];

          return (
            <div className="grid gap-2" key={field.name}>
              <label htmlFor={field.name} className="text-sm font-semibold text-[var(--ink-primary)]">
                {field.label}
              </label>
              <div className="flex min-h-11 overflow-hidden rounded-md border border-[var(--border-soft)] bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--primary)]">
                <input
                  id={field.name}
                  name={field.name}
                  defaultValue={values[field.name]}
                  inputMode="numeric"
                  aria-describedby={error ? errorId : undefined}
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-[var(--ink-primary)] outline-none"
                />
                <span className="flex min-w-12 items-center justify-center border-l border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 text-sm text-[var(--ink-secondary)]">
                  {field.unit}
                </span>
              </div>
              {error ? (
                <p id={errorId} className="text-sm text-[var(--danger)]">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          保存趋势估算配置
        </Button>
      </div>
    </form>
  );
}
