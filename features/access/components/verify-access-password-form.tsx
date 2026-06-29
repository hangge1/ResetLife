import type { VerifyAccessPasswordState } from "../actions/access-form-state";
import { Button } from "@/components/ui/button";

type VerifyAccessPasswordFormProps = {
  fieldErrors?: VerifyAccessPasswordState["fieldErrors"];
};

export function VerifyAccessPasswordForm({ fieldErrors = {} }: VerifyAccessPasswordFormProps) {
  return (
    <form action="verify/submit" className="grid gap-4" method="post">
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

      <Button type="submit">
        进入瘦身助手
      </Button>
    </form>
  );
}
