import Link from "next/link";

import type { PublicRuntimeConfig } from "@/config/env";

const providerLabels: Array<{
  key: keyof PublicRuntimeConfig["providers"];
  label: string;
}> = [
  { key: "storage", label: "Storage" },
  { key: "email", label: "Email" },
  { key: "payment", label: "Payment" },
  { key: "transcode", label: "Transcode" },
  { key: "observability", label: "Observability" },
];

export function RuntimePanel({
  runtime,
}: {
  runtime: PublicRuntimeConfig;
}) {
  return (
    <aside
      aria-label="当前运行配置"
      className="surface overflow-hidden p-1.5"
    >
      <div className="rounded-[0.7rem] bg-[var(--surface-strong)] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--muted)]">
              站长启动台
            </p>
            <h2 className="mt-1 text-base font-semibold">
              跟着当前项目完成开站
            </h2>
          </div>
          <span className="rounded-md bg-[var(--surface)] px-2.5 py-1 font-mono text-xs text-[var(--accent)]">
            {runtime.environment}
          </span>
        </div>
      </div>

      <dl className="px-5 py-2">
        {providerLabels.map(({ key, label }) => (
          <div
            className="grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--line)] py-3 last:border-b-0"
            key={key}
          >
            <dt className="font-mono text-xs text-[var(--muted)]">{label}</dt>
            <dd className="font-mono text-xs font-semibold">
              {runtime.providers[key]}
            </dd>
          </div>
        ))}
      </dl>

      <div className="m-1.5 rounded-[0.7rem] border border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]">
        每一项都会解释意义、具体操作、验收方法，并提供可直接交给 Codex 的 Prompt。
      </div>

      <Link
        className="focus-ring m-1.5 block rounded-[0.7rem] bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-[var(--accent-ink)] transition-transform active:translate-y-px"
        href="/setup"
      >
        开始开站
      </Link>
    </aside>
  );
}
