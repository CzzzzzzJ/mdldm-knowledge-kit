"use client";

import { useState, type FormEvent } from "react";

export function InitialAdminActivationForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/setup/activate-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: form.get("password"),
        passwordConfirmation: form.get("passwordConfirmation"),
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      next?: string;
    };

    if (!response.ok) {
      setMessage(payload.error ?? "正式密码设置失败");
      setBusy(false);
      return;
    }

    window.location.assign(payload.next ?? "/admin/setup");
  }

  return (
    <form className="md-panel mt-8 grid gap-5 p-6 sm:p-8" onSubmit={submit}>
      <div className="grid gap-2 text-sm font-black">
        <label htmlFor="initial-admin-password">设置正式密码</label>
        <input
          aria-describedby="initial-admin-password-help"
          autoComplete="new-password"
          className="md-field"
          disabled={busy}
          id="initial-admin-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
        <span
          className="text-xs font-normal leading-5 text-[var(--muted)]"
          id="initial-admin-password-help"
        >
          至少 12 位，同时包含字母和数字，并且不要与临时密码相同。
        </span>
      </div>
      <div className="grid gap-2 text-sm font-black">
        <label htmlFor="initial-admin-password-confirmation">
          再次输入正式密码
        </label>
        <input
          autoComplete="new-password"
          className="md-field"
          disabled={busy}
          id="initial-admin-password-confirmation"
          minLength={12}
          name="passwordConfirmation"
          required
          type="password"
        />
      </div>

      <p
        aria-live="polite"
        className="min-h-5 text-sm font-semibold text-[var(--danger)]"
      >
        {message}
      </p>

      <button
        className="md-action md-action-primary min-h-12 w-full"
        disabled={busy}
        type="submit"
      >
        {busy ? "正在激活账号" : "保存正式密码并进入开站指南"}
      </button>
    </form>
  );
}
