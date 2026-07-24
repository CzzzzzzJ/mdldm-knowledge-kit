import { ResendVerificationForm } from "@/components/identity-forms";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";

export default function ResendVerificationPage() {
  const site = getSiteConfig();
  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-16">
        <div className="mx-auto max-w-md">
          <h1 className="text-4xl font-semibold tracking-[-0.045em]">
            重发验证邮件
          </h1>
          <p className="mt-3 text-[var(--muted)]">
            为避免泄露账号状态，无论邮箱是否存在都会返回相同提示。
          </p>
          <ResendVerificationForm />
        </div>
      </main>
    </>
  );
}
