"use client";

import { useActionState } from "react";
import { initialVerifyAccessPasswordState } from "../actions/access-form-state";
import { verifyAccessPasswordAction } from "../actions/verify-access-password";
import { Button } from "@/components/ui/button";

export function VerifyAccessPasswordForm() {
  const [state, formAction, pending] = useActionState(
    verifyAccessPasswordAction,
    initialVerifyAccessPasswordState,
  );
  const fieldErrors = state?.fieldErrors ?? initialVerifyAccessPasswordState.fieldErrors;

  return (
    <form action={formAction} className="grid gap-4">
      {fieldErrors.form ? (
        <p className="rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {fieldErrors.form}
        </p>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-semibold text-[var(--ink-primary)]">
          访问密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)]"
        />
        {fieldErrors.password ? (
          <p id="password-error" className="text-sm text-[var(--danger)]">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        进入瘦身助手
      </Button>
    </form>
  );
}
