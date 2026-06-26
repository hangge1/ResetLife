import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAccessRepository } from "@/features/access/repositories/access-repository";
import { hasAccessSecret, verifyTrustedDeviceToken } from "@/features/access/services/access-service";
import { DEVICE_TOKEN_COOKIE } from "@/features/access/services/device-token";
import { VerifyAccessPasswordForm } from "@/features/access/components/verify-access-password-form";

export const dynamic = "force-dynamic";

export default async function VerifyAccessPasswordPage() {
  const repository = createAccessRepository();

  if (!(await hasAccessSecret(repository))) {
    redirect("/access/create");
  }

  const cookieStore = await cookies();
  if (verifyTrustedDeviceToken(repository, cookieStore.get(DEVICE_TOKEN_COOKIE)?.value ?? null).trusted) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-base)] px-4 py-8">
      <section className="card w-full max-w-md p-5">
        <div className="mb-5">
          <p className="mb-2 text-sm font-semibold text-[var(--ink-secondary)]">瘦身助手</p>
          <h1 className="m-0 text-[28px] font-semibold leading-tight text-[var(--ink-primary)]">
            输入访问密码
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">
            当前浏览器还不是受信设备，请输入访问密码继续。
          </p>
        </div>
        <VerifyAccessPasswordForm />
      </section>
    </main>
  );
}
