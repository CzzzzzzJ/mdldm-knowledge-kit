"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

interface ApiPayload {
  error?: string;
  message?: string;
  emailSent?: boolean;
}

const inputClass =
  "focus-ring rounded-lg border border-[var(--line)] bg-[var(--page)] px-4 py-3";
const buttonClass =
  "focus-ring rounded-lg bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--accent-ink)] disabled:opacity-60";

async function postJson(path: string, body: unknown): Promise<{
  ok: boolean;
  payload: ApiPayload;
}> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return {
    ok: response.ok,
    payload: (await response.json()) as ApiPayload,
  };
}

export function RegisterForm() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    const { ok, payload } = await postJson("/api/auth/register", {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
    });

    if (!ok) {
      setStatus(payload.error ?? "注册失败");
      setBusy(false);
      return;
    }

    setStatus(
      payload.emailSent
        ? "账号已创建，请打开邮件完成验证后登录。"
        : "账号已创建，但邮件暂时发送失败。请稍后使用“重发验证邮件”。",
    );
    event.currentTarget.reset();
    setBusy(false);
  }

  return (
    <form className="surface mt-8 grid gap-5 p-7" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-semibold">
        名称
        <input
          autoComplete="name"
          className={inputClass}
          maxLength={80}
          name="name"
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        邮箱
        <input
          autoComplete="email"
          className={inputClass}
          name="email"
          required
          type="email"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        密码
        <input
          autoComplete="new-password"
          className={inputClass}
          minLength={12}
          name="password"
          required
          type="password"
        />
        <span className="font-normal text-[var(--muted)]">
          至少 12 位，同时包含字母和数字。
        </span>
      </label>
      <p aria-live="polite" className="text-sm text-[var(--muted)]">
        {status}
      </p>
      <button className={buttonClass} disabled={busy} type="submit">
        {busy ? "创建中" : "创建普通用户"}
      </button>
    </form>
  );
}

export function ResendVerificationForm() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const { payload } = await postJson("/api/auth/resend-verification", {
      email: form.get("email"),
    });
    setStatus(payload.message ?? payload.error ?? "请求已处理");
    setBusy(false);
  }

  return (
    <form className="surface mt-8 grid gap-5 p-7" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-semibold">
        注册邮箱
        <input className={inputClass} name="email" required type="email" />
      </label>
      <p aria-live="polite" className="text-sm text-[var(--muted)]">
        {status}
      </p>
      <button className={buttonClass} disabled={busy} type="submit">
        重发验证邮件
      </button>
    </form>
  );
}

export function VerifyEmailForm() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify() {
    if (!token) {
      setStatus("验证链接缺少 Token。");
      return;
    }
    setBusy(true);
    const { ok, payload } = await postJson("/api/auth/verify-email", {
      token,
    });
    if (ok) {
      window.location.assign("/login?verified=1");
      return;
    }
    setStatus(payload.error ?? "验证失败");
    setBusy(false);
  }

  return (
    <div className="surface mt-8 grid gap-5 p-7">
      <p className="text-sm leading-6 text-[var(--muted)]">
        点击后会验证当前链接。验证链接只能使用一次。
      </p>
      <p aria-live="polite" className="text-sm text-red-700 dark:text-red-300">
        {status}
      </p>
      <button
        className={buttonClass}
        disabled={busy || !token}
        onClick={() => void verify()}
        type="button"
      >
        {busy ? "验证中" : "验证邮箱"}
      </button>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const { payload } = await postJson("/api/auth/forgot-password", {
      email: form.get("email"),
    });
    setStatus(payload.message ?? payload.error ?? "请求已处理");
    setBusy(false);
  }

  return (
    <form className="surface mt-8 grid gap-5 p-7" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-semibold">
        邮箱
        <input className={inputClass} name="email" required type="email" />
      </label>
      <p aria-live="polite" className="text-sm text-[var(--muted)]">
        {status}
      </p>
      <button className={buttonClass} disabled={busy} type="submit">
        发送重置邮件
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const { ok, payload } = await postJson("/api/auth/reset-password", {
      token,
      password: form.get("password"),
    });
    if (ok) {
      window.location.assign("/courses");
      return;
    }
    setStatus(payload.error ?? "重置失败");
    setBusy(false);
  }

  return (
    <form className="surface mt-8 grid gap-5 p-7" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-semibold">
        新密码
        <input
          autoComplete="new-password"
          className={inputClass}
          minLength={12}
          name="password"
          required
          type="password"
        />
      </label>
      <p aria-live="polite" className="text-sm text-red-700 dark:text-red-300">
        {status}
      </p>
      <button className={buttonClass} disabled={busy || !token} type="submit">
        设置新密码
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const { ok, payload } = await postJson("/api/auth/change-password", {
      currentPassword: form.get("currentPassword"),
      newPassword: form.get("newPassword"),
    });
    setStatus(ok ? "密码已更新，其他会话已经退出。" : payload.error ?? "修改失败");
    setBusy(false);
    if (ok) {
      event.currentTarget.reset();
    }
  }

  return (
    <form className="surface mt-8 grid gap-5 p-7" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-semibold">
        当前密码
        <input
          autoComplete="current-password"
          className={inputClass}
          name="currentPassword"
          required
          type="password"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        新密码
        <input
          autoComplete="new-password"
          className={inputClass}
          minLength={12}
          name="newPassword"
          required
          type="password"
        />
      </label>
      <p aria-live="polite" className="text-sm text-[var(--muted)]">
        {status}
      </p>
      <button className={buttonClass} disabled={busy} type="submit">
        修改密码
      </button>
    </form>
  );
}

export function RedeemInvitationForm() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const { ok, payload } = await postJson("/api/entitlements/redeem", {
      code: form.get("code"),
    });
    setStatus(ok ? "权益已经到账，可以返回课程页学习。" : payload.error ?? "兑换失败");
    setBusy(false);
  }

  return (
    <form className="surface mt-8 grid gap-5 p-7" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-semibold">
        邀请码
        <input
          autoComplete="off"
          className={inputClass}
          name="code"
          placeholder="MDLDM-..."
          required
        />
      </label>
      <p aria-live="polite" className="text-sm text-[var(--muted)]">
        {status}
      </p>
      <button className={buttonClass} disabled={busy} type="submit">
        兑换权益
      </button>
    </form>
  );
}
