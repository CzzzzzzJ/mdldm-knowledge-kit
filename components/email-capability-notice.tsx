import Link from "next/link";

export function EmailCapabilityNotice() {
  return (
    <div className="surface mt-8 p-5">
      <p className="font-semibold">站长暂未启用真实邮件</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        当前站点不能发送验证或重置链接，因此自助注册、重发验证和找回密码暂时停用。
        已有账号仍可正常登录；站长启用 SMTP 后，这些入口会自动恢复。
      </p>
      <Link
        className="mt-4 inline-flex rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
        href="/login"
      >
        返回登录
      </Link>
    </div>
  );
}
