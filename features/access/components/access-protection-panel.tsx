"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { TrustedDevice } from "@/db/schema";
import { changeAccessPasswordAction, type ChangeAccessPasswordState } from "../actions/change-access-password";
import { revokeTrustedDeviceAction } from "../actions/revoke-trusted-device";

type AccessProtectionPanelProps = {
  devices: TrustedDevice[];
};

const initialState: ChangeAccessPasswordState = {
  fieldErrors: {},
};

export function AccessProtectionPanel({ devices }: AccessProtectionPanelProps) {
  const [state, formAction, pending] = useActionState(changeAccessPasswordAction, initialState);

  return (
    <div className="grid gap-5">
      <form action={formAction} className="grid gap-4">
        {state?.successMessage ? (
          <p className="rounded-md border border-[var(--health)] bg-[var(--health-soft)] px-3 py-2 text-sm text-[var(--ink-primary)]">
            {state.successMessage}
          </p>
        ) : null}
        {state?.fieldErrors.form ? <p className="text-sm text-[var(--danger)]">{state.fieldErrors.form}</p> : null}

        {[
          ["currentPassword", "当前访问密码"],
          ["newPassword", "新访问密码"],
          ["confirmPassword", "确认新访问密码"],
        ].map(([name, label]) => {
          const error = state?.fieldErrors[name as keyof ChangeAccessPasswordState["fieldErrors"]];
          return (
            <div className="grid gap-2" key={name}>
              <label htmlFor={name} className="text-sm font-semibold text-[var(--ink-primary)]">
                {label}
              </label>
              <input
                id={name}
                name={name}
                type="password"
                className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)] outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--primary)]"
              />
              {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            </div>
          );
        })}

        <div>
          <Button type="submit" disabled={pending}>
            修改访问密码
          </Button>
        </div>
      </form>

      <div className="border-t border-[var(--border-soft)] pt-4">
        <h3 className="m-0 mb-3 text-base font-semibold text-[var(--ink-primary)]">受信设备</h3>
        <div className="grid gap-2">
          {devices.map((device) => (
            <form action={revokeTrustedDeviceAction} className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3" key={device.id}>
              <input name="deviceId" type="hidden" value={device.id} />
              <div className="grid gap-1 text-sm">
                <p className="m-0 font-semibold text-[var(--ink-primary)]">{device.displayName ?? "受信设备"}</p>
                <p className="m-0 text-[var(--ink-secondary)]">创建时间：{device.createdAtIso}</p>
                <p className="m-0 text-[var(--ink-secondary)]">最近访问：{device.lastSeenAtIso}</p>
              </div>
              <button
                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm font-semibold text-[var(--danger)]"
                onClick={(event) => {
                  if (!window.confirm("确认移除这个受信设备？如果移除当前设备，当前浏览器需要重新验证。")) {
                    event.preventDefault();
                  }
                }}
                type="submit"
              >
                移除
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
