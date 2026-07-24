"use client";

import { useCallback, useEffect, useState } from "react";

interface OperationsSummary {
  checkedAt: string;
  metrics: {
    users: number;
    courses: number;
    publishedCourses: number;
    orders: number;
    paidOrders: number;
    activeEntitlements: number;
    media: number;
    failedMedia: number;
    progress: number;
    completedProgress: number;
    openFailures: number;
    failedPaymentEvents: number;
    revenueInMinorUnits: number;
    currency: string;
  };
  providers: Record<string, { provider: string; status: string }>;
}

interface OperationFailure {
  id: string;
  category: string;
  severity: string;
  code: string;
  summary: string;
  detail: string;
  provider: string | null;
  sourceType: string | null;
  sourceId: string | null;
  occurrenceCount: number;
  lastOccurredAt: string;
}

const metricLabels: Array<
  [keyof OperationsSummary["metrics"], string]
> = [
  ["users", "用户"],
  ["courses", "课程"],
  ["orders", "订单"],
  ["activeEntitlements", "有效权益"],
  ["media", "媒体"],
  ["progress", "学习记录"],
];

export function AdminOperationsPanel() {
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [failures, setFailures] = useState<OperationFailure[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [summaryResponse, failuresResponse] = await Promise.all([
      fetch("/api/admin/operations/summary", { cache: "no-store" }),
      fetch("/api/admin/operations/failures", { cache: "no-store" }),
    ]);
    const summaryPayload = (await summaryResponse.json()) as
      | OperationsSummary
      | { error: string };
    const failuresPayload = (await failuresResponse.json()) as
      | { failures: OperationFailure[] }
      | { error: string };
    if (!summaryResponse.ok || "error" in summaryPayload) {
      throw new Error(
        "error" in summaryPayload ? summaryPayload.error : "读取运营总览失败",
      );
    }
    if (!failuresResponse.ok || "error" in failuresPayload) {
      throw new Error(
        "error" in failuresPayload ? failuresPayload.error : "读取失败队列失败",
      );
    }
    setSummary(summaryPayload);
    setFailures(failuresPayload.failures);
  }, []);

  useEffect(() => {
    void load().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "读取运维状态失败");
    });
  }, [load]);

  async function resolveFailure(failureId: string) {
    const note = window.prompt("请记录处理结果（至少 2 个字）：");
    if (!note) {
      return;
    }
    setBusyId(failureId);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/operations/failures/${failureId}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "处理故障失败");
      }
      await load();
      setMessage("故障已标记为已处理；再次发生时会自动重新打开。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "处理故障失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-10" aria-labelledby="operations-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-[var(--accent)]">OPERATIONS</p>
          <h2
            className="mt-2 text-3xl font-semibold tracking-[-0.04em]"
            id="operations-title"
          >
            运营与故障总览
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a
            className="rounded-lg border border-[var(--line)] px-3 py-2 font-semibold"
            href="/api/admin/export"
          >
            导出运营数据
          </a>
          <a
            className="rounded-lg border border-[var(--line)] px-3 py-2 font-semibold"
            href="/api/health?deep=1"
            rel="noreferrer"
            target="_blank"
          >
            深度健康检查
          </a>
        </div>
      </div>

      <p aria-live="polite" className="mt-3 text-sm text-[var(--muted)]">
        {message ||
          (summary
            ? `最近检查：${new Date(summary.checkedAt).toLocaleString("zh-CN")}`
            : "正在读取运营状态…")}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {metricLabels.map(([key, label]) => (
          <article className="surface p-4" key={key}>
            <p className="text-sm text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-3xl font-semibold">
              {summary?.metrics[key] ?? "—"}
            </p>
          </article>
        ))}
      </div>

      {summary ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.4fr]">
          <article className="surface p-5">
            <p className="font-semibold">关键结果</p>
            <p className="mt-3 text-sm text-[var(--muted)]">
              已发布 {summary.metrics.publishedCourses} 门课程 · 支付成功{" "}
              {summary.metrics.paidOrders} 笔 · 完课{" "}
              {summary.metrics.completedProgress} 条
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              履约收入 ¥
              {(summary.metrics.revenueInMinorUnits / 100).toFixed(2)}
            </p>
          </article>
          <article className="surface p-5">
            <p className="font-semibold">Provider 状态</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(summary.providers).map(([kind, readiness]) => (
                <span
                  className="rounded-full border border-[var(--line)] px-3 py-1 font-mono text-xs"
                  key={kind}
                >
                  {kind}: {readiness.provider} / {readiness.status}
                </span>
              ))}
            </div>
          </article>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-semibold">统一失败队列</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            支付、转码、邮件和存储故障会在此聚合；重复故障累计次数。
          </p>
        </div>
        <p className="font-mono text-xs text-[var(--muted)]">
          {failures.length} OPEN
        </p>
      </div>
      <div className="mt-4 grid gap-3">
        {failures.length === 0 ? (
          <div className="surface p-5 text-sm text-[var(--muted)]">
            当前没有未处理的主要故障。
          </div>
        ) : (
          failures.map((failure) => (
            <article
              className="surface grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center"
              key={failure.id}
            >
              <div>
                <p className="font-mono text-xs text-[var(--accent)]">
                  {failure.category} · {failure.severity} · {failure.code}
                </p>
                <p className="mt-2 font-semibold">{failure.summary}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {failure.detail}
                </p>
                <p className="mt-2 font-mono text-xs text-[var(--muted)]">
                  {failure.provider ?? "internal"} · 累计{" "}
                  {failure.occurrenceCount} 次 ·{" "}
                  {new Date(failure.lastOccurredAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <button
                className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
                disabled={busyId === failure.id}
                onClick={() => void resolveFailure(failure.id)}
                type="button"
              >
                记录处理结果
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
