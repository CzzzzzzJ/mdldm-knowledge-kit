"use client";

import { useState, type FormEvent } from "react";

import type { ResolvedSiteSettings } from "@/modules/site/settings";
import {
  siteThemeOptions,
  type SiteThemeId,
} from "@/modules/site/themes";

interface SocialLinkDraft {
  label: string;
  url: string;
}

export function AdminSiteSettingsForm({
  initialSettings,
}: {
  initialSettings: ResolvedSiteSettings;
}) {
  const [socialLinks, setSocialLinks] = useState<SocialLinkDraft[]>(
    initialSettings.socialLinks,
  );
  const [theme, setTheme] = useState<SiteThemeId>(initialSettings.theme);
  const [message, setMessage] = useState(
    initialSettings.source === "database"
      ? "当前显示已保存的站点设置。"
      : "当前显示安全默认值，首次保存后会写入数据库。",
  );
  const [busy, setBusy] = useState(false);

  function updateSocialLink(
    index: number,
    field: keyof SocialLinkDraft,
    value: string,
  ) {
    setSocialLinks((links) =>
      links.map((link, currentIndex) =>
        currentIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/site", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteName: form.get("siteName"),
        theme,
        description: form.get("description"),
        creatorName: form.get("creatorName"),
        creatorBio: form.get("creatorBio"),
        supportEmail: form.get("supportEmail"),
        homeTitle: form.get("homeTitle"),
        homeSubtitle: form.get("homeSubtitle"),
        avatarUrl: form.get("avatarUrl"),
        heroImageUrl: form.get("heroImageUrl"),
        socialLinks,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      settings?: { theme?: SiteThemeId };
    } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "保存失败，请稍后重试。");
      setBusy(false);
      return;
    }

    const savedTheme = payload?.settings?.theme ?? theme;
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
    setMessage("站点设置已保存，当前页面和后续访问已经使用新主题。");
    setBusy(false);
  }

  const inputClass =
    "focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--page)] px-3.5 py-2.5";

  return (
    <form className="mt-8 grid gap-8" onSubmit={(event) => void submit(event)}>
      <fieldset className="surface grid gap-4 p-6">
        <div>
          <legend className="text-xl font-semibold">站点主题</legend>
          <p className="mt-1 text-sm text-[var(--muted)]">
            主题只改变颜色、边框、圆角和层级，不改变支付、权益、课程和后台数据。
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {siteThemeOptions.map((option) => (
            <label
              className="focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[var(--brand-blue)] grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-4"
              key={option.id}
            >
              <input
                checked={theme === option.id}
                name="theme"
                onChange={() => setTheme(option.id)}
                type="radio"
                value={option.id}
              />
              <span>
                <strong className="block text-sm">{option.label}</strong>
                <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="surface grid gap-4 p-6">
        <div>
          <h2 className="text-xl font-semibold">站点品牌</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            这些内容会用于首页、导航和站点介绍，不包含任何平台密钥。
          </p>
        </div>
        <label className="grid gap-2 text-sm">
          站点名称
          <input
            className={inputClass}
            defaultValue={initialSettings.siteName}
            maxLength={80}
            name="siteName"
            required
          />
        </label>
        <label className="grid gap-2 text-sm">
          站点简介
          <textarea
            className={inputClass}
            defaultValue={initialSettings.description}
            maxLength={500}
            name="description"
            required
            rows={3}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            首页标题
            <input
              className={inputClass}
              defaultValue={initialSettings.homeTitle}
              maxLength={120}
              name="homeTitle"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            首页副标题
            <input
              className={inputClass}
              defaultValue={initialSettings.homeSubtitle}
              maxLength={500}
              name="homeSubtitle"
              required
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            首页主视觉 URL（可选）
            <input
              className={inputClass}
              defaultValue={initialSettings.heroImageUrl ?? ""}
              inputMode="url"
              name="heroImageUrl"
              placeholder="https://example.com/hero.jpg"
              type="url"
            />
          </label>
          <label className="grid gap-2 text-sm">
            创作者头像 URL（可选）
            <input
              className={inputClass}
              defaultValue={initialSettings.avatarUrl ?? ""}
              inputMode="url"
              name="avatarUrl"
              placeholder="https://example.com/avatar.jpg"
              type="url"
            />
          </label>
        </div>
      </section>

      <section className="surface grid gap-4 p-6">
        <div>
          <h2 className="text-xl font-semibold">创作者资料</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            告诉学员是谁在持续维护这个知识站，以及遇到问题时如何联系。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            创作者名称
            <input
              className={inputClass}
              defaultValue={initialSettings.creatorName}
              maxLength={80}
              name="creatorName"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            客服邮箱
            <input
              className={inputClass}
              defaultValue={initialSettings.supportEmail}
              maxLength={254}
              name="supportEmail"
              required
              type="email"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm">
          创作者介绍
          <textarea
            className={inputClass}
            defaultValue={initialSettings.creatorBio}
            maxLength={1_000}
            name="creatorBio"
            rows={5}
          />
        </label>
      </section>

      <section className="surface grid gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">社交链接</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              最多添加 8 个公开主页，不要填写后台地址或带 Token 的链接。
            </p>
          </div>
          <button
            className="focus-ring rounded-lg border border-[var(--line)] px-4 py-2 text-sm"
            disabled={busy || socialLinks.length >= 8}
            onClick={() =>
              setSocialLinks((links) => [...links, { label: "", url: "" }])
            }
            type="button"
          >
            添加链接
          </button>
        </div>

        {socialLinks.length === 0 ? (
          <p className="rounded-lg bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
            暂未添加社交链接。
          </p>
        ) : null}

        {socialLinks.map((link, index) => (
          <div
            className="grid gap-3 rounded-xl border border-[var(--line)] p-4 md:grid-cols-[0.7fr_1.3fr_auto]"
            key={index}
          >
            <input
              aria-label={`社交链接 ${index + 1} 名称`}
              className={inputClass}
              maxLength={40}
              onChange={(event) =>
                updateSocialLink(index, "label", event.currentTarget.value)
              }
              placeholder="Bilibili"
              required
              value={link.label}
            />
            <input
              aria-label={`社交链接 ${index + 1} URL`}
              className={inputClass}
              onChange={(event) =>
                updateSocialLink(index, "url", event.currentTarget.value)
              }
              placeholder="https://space.bilibili.com/..."
              required
              type="url"
              value={link.url}
            />
            <button
              className="focus-ring rounded-lg border border-[var(--line)] px-4 py-2 text-sm"
              disabled={busy}
              onClick={() =>
                setSocialLinks((links) =>
                  links.filter((_, currentIndex) => currentIndex !== index),
                )
              }
              type="button"
            >
              移除
            </button>
          </div>
        ))}
      </section>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xl">
        <p aria-live="polite" className="text-sm text-[var(--muted)]">
          {message}
        </p>
        <button
          className="focus-ring rounded-lg bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--accent-ink)]"
          disabled={busy}
          type="submit"
        >
          {busy ? "正在保存…" : "保存站点设置"}
        </button>
      </div>
    </form>
  );
}
