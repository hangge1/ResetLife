import { redirect } from "next/navigation";
import { createAccessRepository } from "@/features/access/repositories/access-repository";
import { hasAccessSecret } from "@/features/access/services/access-service";
import type { CreateAccessPasswordState } from "@/features/access/actions/access-form-state";
import { CreateAccessPasswordForm } from "@/features/access/components/create-access-password-form";

export const dynamic = "force-dynamic";

type CreateAccessPasswordPageProps = {
  searchParams?: Promise<{
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>;
};

export default async function CreateAccessPasswordPage({ searchParams }: CreateAccessPasswordPageProps) {
  if (await hasAccessSecret(createAccessRepository())) {
    redirect("/");
  }

  const params = await searchParams;
  const fieldErrors: CreateAccessPasswordState["fieldErrors"] = {
    password: params?.password,
    confirmPassword: params?.confirmPassword,
    form: params?.form,
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-base)] px-4 py-8">
      <section className="card w-full max-w-md p-5">
        <div className="mb-5">
          <p className="mb-2 text-sm font-semibold text-[var(--ink-secondary)]">瘦身助手</p>
          <h1 className="m-0 text-[28px] font-semibold leading-tight text-[var(--ink-primary)]">
            创建访问密码
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">
            第一次使用前先设置一个访问密码，后续访问会用受信设备识别。
          </p>
        </div>
        <CreateAccessPasswordForm fieldErrors={fieldErrors} />
      </section>
    </main>
  );
}
