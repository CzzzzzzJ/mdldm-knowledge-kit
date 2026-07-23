"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "登录失败");
      setSubmitting(false);
      return;
    }

    const next = searchParams.get("next");
    window.location.assign(next?.startsWith("/") ? next : "/admin");
  }

  return (
    <form className="surface mt-8 grid gap-5 p-7" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-semibold" htmlFor="email">
          邮箱
        </label>
        <input
          autoComplete="email"
          className="focus-ring rounded-lg border border-[var(--line)] bg-[var(--page)] px-4 py-3"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold" htmlFor="password">
          密码
        </label>
        <input
          autoComplete="current-password"
          className="focus-ring rounded-lg border border-[var(--line)] bg-[var(--page)] px-4 py-3"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      ) : null}

      <button
        className="focus-ring rounded-lg bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--accent-ink)] disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "登录中" : "登录"}
      </button>
    </form>
  );
}
