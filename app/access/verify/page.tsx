import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { VerifyAccessPasswordState } from "@/features/access/actions/access-form-state";
import { VerifyAccessPasswordForm } from "@/features/access/components/verify-access-password-form";
import { createUserRepository } from "@/features/access/repositories/user-repository";
import { USER_SESSION_COOKIE } from "@/features/access/services/auth-context";
import { resolveSession } from "@/features/access/services/user-auth-service";

export const dynamic = "force-dynamic";

type VerifyAccessPasswordPageProps = {
  searchParams?: Promise<{
    username?: string;
    password?: string;
    form?: string;
  }>;
};

export default async function VerifyAccessPasswordPage({ searchParams }: VerifyAccessPasswordPageProps) {
  const repository = createUserRepository();
  repository.ensureLegacyDefaultAdmin(new Date().toISOString());
  const activeUsers = repository.countActiveUsers();

  if (activeUsers.ok && activeUsers.data === 0) {
    redirect("/access/create");
  }

  const cookieStore = await cookies();
  const session = resolveSession(repository, cookieStore.get(USER_SESSION_COOKIE)?.value ?? null);
  if (session.ok && session.data) {
    redirect("/");
  }

  const params = await searchParams;
  const fieldErrors: VerifyAccessPasswordState["fieldErrors"] = {
    username: params?.username,
    password: params?.password,
    form: params?.form,
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-base)] px-4 py-8">
      <section className="card w-full max-w-md p-5">
        <div className="mb-5">
          <p className="mb-2 text-sm font-semibold text-[var(--ink-secondary)]">瘦身助手</p>
          <h1 className="m-0 text-[28px] font-semibold leading-tight text-[var(--ink-primary)]">登录</h1>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">
            使用账号进入自己的数据空间，或使用访客模式临时体验。
          </p>
        </div>
        <VerifyAccessPasswordForm fieldErrors={fieldErrors} />
      </section>
    </main>
  );
}
