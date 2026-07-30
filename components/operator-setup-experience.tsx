"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { PublicRuntimeConfig } from "@/config/env";
import type { SetupLesson } from "@/modules/site/setup-guide";

const progressStorageKey = "mdldm-operator-setup-progress-v1";

interface HealthResponse {
  status: "ok" | "degraded";
  database: {
    status: "ok" | "error" | "not_checked";
    message: string;
  };
  warnings: string[];
}

function readSavedProgress(): string[] {
  try {
    const value = window.localStorage.getItem(progressStorageKey);
    if (!value) {
      return [];
    }

    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

async function copyText(value: string) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Some embedded browsers expose Clipboard API but deny write access.
      // Fall through to the selection-based copy path.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("浏览器拒绝复制");
  }
}

function providerValue(
  lesson: SetupLesson,
  runtime: PublicRuntimeConfig,
): string {
  if (lesson.slug === "storage") {
    return runtime.providers.storage;
  }
  if (lesson.slug === "email") {
    return runtime.providers.email;
  }
  if (lesson.slug === "payment") {
    return runtime.providers.payment;
  }
  if (lesson.slug === "deploy") {
    return runtime.environment;
  }
  if (lesson.slug === "database") {
    return "MongoDB";
  }

  return runtime.appName;
}

export function OperatorSetupExperience({
  lessons,
  initialLesson,
  runtime,
  configWarnings,
}: {
  lessons: readonly SetupLesson[];
  initialLesson: SetupLesson;
  runtime: PublicRuntimeConfig;
  configWarnings: string[];
}) {
  const [activeSlug, setActiveSlug] = useState(initialLesson.slug);
  const [completed, setCompleted] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [health, setHealth] = useState<
    | { state: "idle" }
    | { state: "loading" }
    | { state: "ready"; data: HealthResponse }
    | { state: "error"; message: string }
  >({ state: "idle" });

  useEffect(() => {
    setCompleted(readSavedProgress());
  }, []);

  const activeIndex = useMemo(
    () => Math.max(0, lessons.findIndex((lesson) => lesson.slug === activeSlug)),
    [activeSlug, lessons],
  );
  const lesson = lessons[activeIndex] ?? initialLesson;
  const previous = lessons[activeIndex - 1];
  const next = lessons[activeIndex + 1];

  function selectLesson(slug: string) {
    setActiveSlug(slug);
    setCopied(false);
    const url = new URL(window.location.href);
    url.searchParams.set("lesson", slug);
    window.history.replaceState({}, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleComplete() {
    const nextCompleted = completed.includes(lesson.slug)
      ? completed.filter((slug) => slug !== lesson.slug)
      : [...completed, lesson.slug];
    setCompleted(nextCompleted);
    window.localStorage.setItem(
      progressStorageKey,
      JSON.stringify(nextCompleted),
    );
  }

  async function handleCopyPrompt() {
    try {
      await copyText(lesson.prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function runHealthCheck() {
    setHealth({ state: "loading" });
    try {
      const response = await fetch("/api/health?deep=1", {
        cache: "no-store",
      });
      const data = (await response.json()) as HealthResponse;
      setHealth({ state: "ready", data });
    } catch (error) {
      setHealth({
        state: "error",
        message: error instanceof Error ? error.message : "无法读取健康检查",
      });
    }
  }

  const groups = Array.from(new Set(lessons.map((item) => item.group)));
  const isComplete = completed.includes(lesson.slug);

  return (
    <div className="min-h-[100dvh] bg-[var(--page)]">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]/94 backdrop-blur">
        <div className="page-shell flex h-[4.5rem] items-center justify-between gap-5">
          <Link
            className="focus-ring flex min-w-0 items-center gap-3 rounded-lg"
            href="/"
          >
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-lg bg-[var(--ink)] font-mono text-sm font-bold text-[var(--page)]"
            >
              MK
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {runtime.appName}
              </span>
              <span className="block text-xs text-[var(--muted)]">
                首次开站
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-[var(--muted)] sm:block">
              教学进度 {completed.length}/{lessons.length}
            </span>
            <Link
              className="focus-ring whitespace-nowrap rounded-lg border border-[var(--line)] bg-[var(--page)] px-3.5 py-2 font-medium transition-transform active:translate-y-px"
              href="/courses"
            >
              查看学员端
            </Link>
          </div>
        </div>
      </header>

      <main className="page-shell py-6 lg:py-10">
        <div className="mb-6 xl:hidden">
          <label
            className="mb-2 block text-sm font-semibold"
            htmlFor="setup-lesson"
          >
            当前任务
          </label>
          <select
            className="focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm"
            id="setup-lesson"
            onChange={(event) => selectLesson(event.target.value)}
            value={lesson.slug}
          >
            {lessons.map((item) => (
              <option key={item.slug} value={item.slug}>
                {completed.includes(item.slug) ? "已读：" : ""}
                {item.navLabel}
              </option>
            ))}
          </select>
        </div>

        <div className="grid items-start gap-7 xl:grid-cols-[15rem_minmax(0,1fr)_17rem]">
          <aside className="sticky top-[6.5rem] hidden xl:block">
            <nav aria-label="首次开站任务">
              {groups.map((group) => (
                <div className="mb-7" key={group}>
                  <p className="mb-2 text-xs font-semibold text-[var(--muted)]">
                    {group}
                  </p>
                  <ol className="space-y-1">
                    {lessons
                      .filter((item) => item.group === group)
                      .map((item) => {
                        const itemIndex = lessons.findIndex(
                          (candidate) => candidate.slug === item.slug,
                        );
                        const selected = item.slug === lesson.slug;
                        const itemComplete = completed.includes(item.slug);

                        return (
                          <li key={item.slug}>
                            <button
                              aria-current={selected ? "step" : undefined}
                              className={`focus-ring grid w-full grid-cols-[1.75rem_1fr] items-start gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm transition-colors ${
                                selected
                                  ? "bg-[var(--surface-strong)] font-semibold text-[var(--ink)]"
                                  : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                              }`}
                              onClick={() => selectLesson(item.slug)}
                              type="button"
                            >
                              <span
                                className={`grid size-6 place-items-center rounded-md border font-mono text-[0.68rem] ${
                                  itemComplete
                                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                                    : "border-[var(--line)]"
                                }`}
                              >
                                {itemComplete ? "✓" : itemIndex + 1}
                              </span>
                              <span className="pt-0.5">{item.navLabel}</span>
                            </button>
                          </li>
                        );
                      })}
                  </ol>
                </div>
              ))}
            </nav>
          </aside>

          <article className="min-w-0">
            <div className="mb-8">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
                <span>{lesson.group}</span>
                <span aria-hidden="true">/</span>
                <span>约 {lesson.estimatedMinutes} 分钟</span>
              </div>
              <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-5xl">
                {lesson.title}
              </h1>
              <p className="mt-5 max-w-[44rem] text-lg leading-8 text-[var(--muted)]">
                {lesson.summary}
              </p>
            </div>

            <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
              <h2 className="text-xl font-semibold">为什么要做这一步</h2>
              <p className="mt-3 max-w-[48rem] leading-7 text-[var(--muted)]">
                {lesson.purpose}
              </p>
              <div className="mt-6 rounded-xl bg-[var(--surface-strong)] p-4">
                <p className="text-sm font-semibold">完成后你会得到</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {lesson.outcome}
                </p>
              </div>
            </section>

            <section className="py-10">
              <h2 className="text-2xl font-semibold tracking-[-0.025em]">
                在当前项目中完成
              </h2>
              <ol className="mt-6 space-y-5">
                {lesson.actions.map((action, index) => (
                  <li
                    className="grid grid-cols-[2rem_1fr] gap-4"
                    key={action.title}
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-[var(--surface-strong)] font-mono text-xs font-semibold text-[var(--accent)]">
                      {index + 1}
                    </span>
                    <div className="border-b border-[var(--line)] pb-5">
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="mt-2 max-w-[46rem] text-sm leading-6 text-[var(--muted)]">
                        {action.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {lesson.envKeys.length > 0 ? (
              <section className="mb-10">
                <h2 className="text-2xl font-semibold tracking-[-0.025em]">
                  只把这些变量放进部署环境
                </h2>
                <p className="mt-3 max-w-[46rem] text-sm leading-6 text-[var(--muted)]">
                  页面不接收密钥，也不会保存变量值。变量名可以公开，真实值只能进入你自己的
                  Vercel 或 .env.local。
                </p>
                <div className="mt-5 grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-2">
                  {lesson.envKeys.map((key) => (
                    <code
                      className="rounded-lg bg-[var(--page)] px-3 py-2.5 font-mono text-xs"
                      key={key}
                    >
                      {key}
                    </code>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mb-10 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
              <h2 className="text-xl font-semibold">怎么确认真的完成了</h2>
              <pre className="mt-5 overflow-x-auto rounded-xl bg-[var(--ink)] p-4 font-mono text-xs leading-6 text-[var(--page)]">
                <code>{lesson.validation.command}</code>
              </pre>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                {lesson.validation.expected}
              </p>
            </section>

            <section className="mb-10 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
              <div className="flex flex-col gap-3 border-b border-[var(--line)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    交给 Codex 或 Agent
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    复制后直接粘贴到当前仓库的任务中。
                  </p>
                </div>
                <button
                  className="focus-ring whitespace-nowrap rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] transition-transform active:translate-y-px"
                  onClick={handleCopyPrompt}
                  type="button"
                >
                  {copied ? "已复制" : "复制 Prompt"}
                </button>
              </div>
              <pre className="max-h-[30rem] overflow-auto whitespace-pre-wrap bg-[var(--ink)] p-6 font-mono text-xs leading-6 text-[var(--page)]">
                <code>{lesson.prompt}</code>
              </pre>
            </section>

            {lesson.links.length > 0 ? (
              <section className="mb-10">
                <h2 className="text-lg font-semibold">继续查看</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {lesson.links.map((link) => (
                    link.href.startsWith("http") ? (
                      <a
                        className="focus-ring whitespace-nowrap rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold transition-transform active:translate-y-px"
                        href={link.href}
                        key={link.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        className="focus-ring whitespace-nowrap rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold transition-transform active:translate-y-px"
                        href={link.href}
                        key={link.href}
                      >
                        {link.label}
                      </Link>
                    )
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-7 sm:flex-row sm:items-center sm:justify-between">
              <button
                aria-pressed={isComplete}
                className={`focus-ring whitespace-nowrap rounded-lg px-4 py-3 text-sm font-semibold transition-transform active:translate-y-px ${
                  isComplete
                    ? "border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)]"
                    : "bg-[var(--accent)] text-[var(--accent-ink)]"
                }`}
                onClick={toggleComplete}
                type="button"
              >
                {isComplete ? "已记录教学进度" : "标记为已理解"}
              </button>

              <div className="flex items-center gap-2">
                {previous ? (
                  <button
                    className="focus-ring whitespace-nowrap rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold transition-transform active:translate-y-px"
                    onClick={() => selectLesson(previous.slug)}
                    type="button"
                  >
                    上一项
                  </button>
                ) : null}
                {next ? (
                  <button
                    className="focus-ring whitespace-nowrap rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-semibold transition-transform active:translate-y-px"
                    onClick={() => selectLesson(next.slug)}
                    type="button"
                  >
                    下一项：{next.navLabel}
                  </button>
                ) : (
                  <Link
                    className="focus-ring whitespace-nowrap rounded-lg bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-[var(--page)] transition-transform active:translate-y-px"
                    href="/admin"
                  >
                    进入当前后台
                  </Link>
                )}
              </div>
            </div>
          </article>

          <aside className="space-y-4 xl:sticky xl:top-[6.5rem]">
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <p className="text-sm font-semibold">当前项目状态</p>
              <p className="mt-4 font-mono text-sm font-semibold text-[var(--accent)]">
                {providerValue(lesson, runtime)}
              </p>
              <p className="mt-2 break-all text-xs leading-5 text-[var(--muted)]">
                {lesson.slug === "deploy"
                  ? runtime.appUrl
                  : "读取自当前项目的公开运行配置，不包含任何密钥。"}
              </p>
              <button
                className="focus-ring mt-5 w-full rounded-lg border border-[var(--line)] bg-[var(--page)] px-3 py-2.5 text-sm font-semibold transition-transform active:translate-y-px disabled:cursor-wait disabled:opacity-60"
                disabled={health.state === "loading"}
                onClick={runHealthCheck}
                type="button"
              >
                {health.state === "loading"
                  ? "正在检查"
                  : "运行只读健康检查"}
              </button>
              <div aria-live="polite" className="mt-3 text-xs leading-5">
                {health.state === "idle" ? (
                  <p className="text-[var(--muted)]">
                    只连接 MongoDB 并读取 Provider 选择，不写入外部状态。
                  </p>
                ) : null}
                {health.state === "ready" ? (
                  <div>
                    <p
                      className={
                        health.data.database.status === "ok"
                          ? "font-semibold text-[var(--success)]"
                          : "font-semibold text-[var(--warning)]"
                      }
                    >
                      MongoDB：{health.data.database.status}
                    </p>
                    <p className="mt-1 text-[var(--muted)]">
                      {health.data.database.message}
                    </p>
                  </div>
                ) : null}
                {health.state === "error" ? (
                  <p className="text-[var(--danger)]">{health.message}</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <h2 className="text-sm font-semibold">安全边界</h2>
              <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                不要把密钥粘贴到这个页面。Prompt 会要求 Agent 隐藏敏感值，并在产生外部状态前向你确认。
              </p>
            </section>

            <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <h2 className="text-sm font-semibold">需要注意</h2>
              {configWarnings.length > 0 ? (
                <ul className="mt-3 space-y-3 text-xs leading-5 text-[var(--muted)]">
                  {configWarnings.slice(0, 3).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                  当前配置没有启动级警告。仍需完成真实业务验收。
                </p>
              )}
            </section>

            <p className="px-1 text-xs leading-5 text-[var(--muted)]">
              “已理解”只保存本浏览器的教学进度，不代表 Provider 已通过生产验证。
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
