import { redirect } from "next/navigation";
import type { CreateAccessPasswordState } from "@/features/access/actions/access-form-state";
import { CreateAccessPasswordForm } from "@/features/access/components/create-access-password-form";
import { createUserRepository } from "@/features/access/repositories/user-repository";

export const dynamic = "force-dynamic";

type CreateAccessPasswordPageProps = {
  searchParams?: Promise<{
    username?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>;
};

export default async function CreateAccessPasswordPage({ searchParams }: CreateAccessPasswordPageProps) {
  const userRepository = createUserRepository();
  userRepository.ensureLegacyDefaultAdmin(new Date().toISOString());
  const activeUsers = userRepository.countActiveUsers();

  if (activeUsers.ok && activeUsers.data > 0) {
    redirect("/");
  }

  const params = await searchParams;
  const fieldErrors: CreateAccessPasswordState["fieldErrors"] = {
    username: params?.username,
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
            创建管理员账号
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">
            第一次使用前先创建管理员。第一个账号会自动拥有用户管理权限。
          </p>
        </div>
        <CreateAccessPasswordForm fieldErrors={fieldErrors} />
      </section>
    </main>
  );
}
