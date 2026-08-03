"use client";

import { useState, type FormEvent } from "react";

interface InitialCredential {
  email: string;
  temporaryPassword: string;
  next: string;
  sessionCreated: boolean;
}

export function InitialAdminSetupForm({
  available,
  requiresSetupToken,
}: {
  available: boolean;
  requiresSetupToken: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [credential, setCredential] = useState<InitialCredential | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/setup/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        emailConfirmation: form.get("emailConfirmation"),
        setupToken: requiresSetupToken ? form.get("setupToken") : undefined,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      next?: string;
      temporaryPassword?: string;
      sessionCreated?: boolean;
      user?: { email: string };
    };

    if (!response.ok || !payload.temporaryPassword || !payload.user?.email) {
      setMessage(payload.error ?? "管理员创建失败");
      setBusy(false);
      return;
    }

    setCredential({
      email: payload.user.email,
      temporaryPassword: payload.temporaryPassword,
      next: payload.next ?? "/admin/activate",
      sessionCreated: payload.sessionCreated !== false,
    });
    setBusy(false);
  }

  async function copyTemporaryPassword() {
    if (!credential) {
      return;
    }
    await navigator.clipboard.writeText(credential.temporaryPassword);
    setCopied(true);
  }

  if (credential) {
    return (
      <section className="md-panel mt-8 grid gap-6 p-6 sm:p-8">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">
            管理员 1 号已创建
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
            保存这份临时登录信息
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            临时密码只在本页展示这一次，不会写入日志或浏览器存储。关闭或刷新页面后，系统无法再次显示原文。
          </p>
        </div>

        <dl className="grid gap-4 border-2 border-[var(--ink)] bg-[var(--surface-strong)] p-5">
          <div>
            <dt className="text-xs font-black text-[var(--muted)]">管理员邮箱</dt>
            <dd className="mt-2 break-all font-mono text-sm font-black">
              {credential.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-black text-[var(--muted)]">临时密码</dt>
            <dd className="mt-2 break-all font-mono text-lg font-black" data-testid="temporary-admin-password">
              {credential.temporaryPassword}
            </dd>
          </div>
        </dl>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="md-action min-h-12"
            onClick={() => void copyTemporaryPassword()}
            type="button"
          >
            {copied ? "临时密码已复制" : "复制临时密码"}
          </button>
          <button
            className="md-action md-action-primary min-h-12"
            onClick={() => window.location.assign(credential.next)}
            type="button"
          >
            设置我的正式密码
          </button>
        </div>

        <p className="border-l-4 border-[var(--accent)] pl-4 text-xs font-semibold leading-5 text-[var(--muted)]">
          {credential.sessionCreated
            ? "系统已经自动登录，但在设置正式密码前不会开放其他后台页面。如果你误关页面，可用上面的邮箱和临时密码重新登录。"
            : "账号已经安全创建，但自动登录未完成。请保存临时密码并前往登录，系统随后会要求设置正式密码。"}
        </p>
      </section>
    );
  }

  return (
    <form
      className="md-panel mt-8 grid gap-5 p-6 sm:p-8"
      onSubmit={submit}
    >
      <div className="grid gap-2 text-sm font-black">
        <label htmlFor="initial-admin-email">管理员邮箱</label>
        <input
          aria-describedby="initial-admin-email-help"
          autoComplete="email"
          className="md-field"
          disabled={!available || busy}
          id="initial-admin-email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
        <span
          className="text-xs font-normal leading-5 text-[var(--muted)]"
          id="initial-admin-email-help"
        >
          这个邮箱会直接成为管理员 1 号，也是以后登录后台的账号。
        </span>
      </div>

      <div className="grid gap-2 text-sm font-black">
        <label htmlFor="initial-admin-email-confirmation">
          再次确认管理员邮箱
        </label>
        <input
          autoComplete="off"
          className="md-field"
          disabled={!available || busy}
          id="initial-admin-email-confirmation"
          name="emailConfirmation"
          placeholder="再次输入同一个邮箱"
          required
          type="email"
        />
      </div>

      {requiresSetupToken ? (
        <div className="grid gap-2 text-sm font-black">
          <label htmlFor="initial-setup-token">一次性初始化口令</label>
          <input
            aria-describedby="initial-setup-token-help"
            autoComplete="off"
            className="md-field"
            disabled={!available || busy}
            id="initial-setup-token"
            name="setupToken"
            required
            type="password"
          />
          <span
            className="text-xs font-normal leading-5 text-[var(--muted)]"
            id="initial-setup-token-help"
          >
            使用部署平台中 INITIAL_SETUP_TOKEN 的值。它只保护生产初始化入口，不是管理员密码。
          </span>
        </div>
      ) : null}

      {!available ? (
        <p className="border-2 border-[var(--danger)] bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--danger)]">
          当前生产环境尚未配置有效的 AUTH_SECRET 或 INITIAL_SETUP_TOKEN。请先在部署平台补齐后重新部署。
        </p>
      ) : null}

      <p
        aria-live="polite"
        className="min-h-5 text-sm font-semibold text-[var(--danger)]"
      >
        {message}
      </p>

      <button
        className="md-action md-action-primary min-h-12 w-full"
        disabled={!available || busy}
        type="submit"
      >
        {busy ? "正在创建管理员 1 号" : "确认邮箱并创建管理员 1 号"}
      </button>
    </form>
  );
}
