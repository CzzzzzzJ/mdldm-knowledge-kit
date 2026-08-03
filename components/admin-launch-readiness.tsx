"use client";

import Link from "next/link";
import { useState } from "react";

import type { SetupReadiness } from "@/modules/site/initialization";

export function AdminLaunchReadiness({
  readiness,
  isLive,
}: {
  readiness: SetupReadiness;
  isLive: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function launch() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/setup/launch", {
      method: "POST",
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "开站失败，请检查未完成项目");
      setBusy(false);
      return;
    }
    window.location.assign("/admin");
  }

  return (
    <section
      className="mt-12 scroll-mt-28 border-t-2 border-[var(--ink)] pt-10"
      id="launch-checklist"
    >
      <div className="max-w-3xl">
        <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">
          上线检查
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
          {isLive ? "网站已经正式运行" : "完成这些项目后再正式开站"}
        </h2>
        <p className="mt-3 leading-7 text-[var(--muted)]">
          这里读取数据库和运行环境中的真实状态。教学勾选不能代替课程、商品和 Provider 验证。
        </p>
      </div>

      <div className="mt-7 grid gap-3">
        {readiness.items.map((item) => (
          <article
            className="grid gap-4 border-2 border-[var(--ink)] bg-[var(--surface)] p-5 sm:grid-cols-[7rem_1fr_auto] sm:items-center"
            key={item.key}
          >
            <span
              className={`font-mono text-xs font-black ${
                item.ready ? "text-[var(--success)]" : "text-[var(--warning)]"
              }`}
            >
              {item.ready ? "已完成" : "待处理"}
            </span>
            <div>
              <h3 className="font-black">{item.label}</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                {item.detail}
              </p>
            </div>
            <Link
              className="md-text-link whitespace-nowrap text-sm"
              href={item.href}
            >
              {item.ready ? "查看" : "去完成"}
            </Link>
          </article>
        ))}
      </div>

      {readiness.warnings.length > 0 ? (
        <div className="mt-6 border-2 border-[var(--warning)] bg-[var(--surface)] p-5">
          <h3 className="font-black">当前环境提醒</h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--muted)]">
            {readiness.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        {isLive ? (
          <Link className="md-action md-action-primary" href="/">
            查看正式网站
          </Link>
        ) : (
          <button
            className="md-action md-action-primary"
            disabled={!readiness.canLaunch || busy}
            onClick={() => void launch()}
            type="button"
          >
            {busy ? "正在开站" : "正式开放网站"}
          </button>
        )}
        {!readiness.canLaunch && !isLive ? (
          <p className="text-sm text-[var(--muted)]">
            仍有未完成项目，按钮暂不可用。
          </p>
        ) : null}
      </div>
      <p
        aria-live="polite"
        className="mt-3 min-h-5 text-sm font-semibold text-[var(--danger)]"
      >
        {message}
      </p>
    </section>
  );
}
