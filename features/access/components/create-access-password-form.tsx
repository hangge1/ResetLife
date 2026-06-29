import type { CreateAccessPasswordState } from "../actions/access-form-state";
import { Button } from "@/components/ui/button";

type CreateAccessPasswordFormProps = {
  fieldErrors?: CreateAccessPasswordState["fieldErrors"];
};

export function CreateAccessPasswordForm({ fieldErrors = {} }: CreateAccessPasswordFormProps) {
  return (
    <form action="create/submit" className="grid gap-4" method="post">
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
          autoComplete="new-password"
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)]"
        />
        {fieldErrors.password ? (
          <p id="password-error" className="text-sm text-[var(--danger)]">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label htmlFor="confirmPassword" className="text-sm font-semibold text-[var(--ink-primary)]">
          确认访问密码
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
          className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)]"
        />
        {fieldErrors.confirmPassword ? (
          <p id="confirm-password-error" className="text-sm text-[var(--danger)]">
            {fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      <Button type="submit">
        创建访问密码
      </Button>
    </form>
  );
}
