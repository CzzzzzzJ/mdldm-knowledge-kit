"use client";

import Link from "next/link";
import { useState } from "react";

export function AdminAccountActions({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="hidden text-right text-xs lg:block">
        <p className="text-[var(--muted)]">当前管理员</p>
        <p className="mt-1 max-w-56 truncate font-bold">{email}</p>
      </div>
      <Link
        className="md-action md-action-secondary min-h-9 px-3 py-2 text-xs"
        href="/admin/users"
      >
        账号
      </Link>
      <button
        className="md-action md-action-secondary min-h-9 px-3 py-2 text-xs"
        disabled={busy}
        onClick={() => void logout()}
        type="button"
      >
        {busy ? "正在退出" : "退出"}
      </button>
    </div>
  );
}
