import Link from "next/link";

import { RuntimePanel } from "@/components/runtime-panel";
import { SiteHeader } from "@/components/site-header";
import { getPublicRuntimeConfig } from "@/config/env";
import { getFeaturesConfig } from "@/config/features.config";
import { productsConfig } from "@/config/products.config";
import { getSiteConfig } from "@/config/site.config";

const domains = [
  "Site",
  "Identity",
  "Catalog",
  "Entitlement",
  "Commerce",
  "Media",
  "Learning",
  "Operations",
];

export const dynamic = "force-dynamic";

export default function HomePage() {
  const site = getSiteConfig();
  const runtime = getPublicRuntimeConfig();
  const features = getFeaturesConfig();
  const enabledFeatureCount = Object.values(features).filter(Boolean).length;

  return (
    <>
      <SiteHeader site={site} />
      <main>
        <section className="page-shell grid min-h-[calc(100dvh-4.5rem)] items-center gap-12 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
          <div className="max-w-3xl">
            <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Self-hosted knowledge delivery
            </p>
            <h1 className="max-w-[11em] text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              知识产品，自己交付
            </h1>
            <p className="mt-7 max-w-[42rem] text-lg leading-8 text-[var(--muted)]">
              一套可自托管的课程、会员、单课购买与学习运营底座。
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="focus-ring whitespace-nowrap rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-ink)] transition-transform hover:bg-[var(--accent-strong)] active:translate-y-px"
                href="/courses"
              >
                浏览课程
              </Link>
              <a
                className="focus-ring whitespace-nowrap rounded-lg border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold transition-transform active:translate-y-px"
                href="#architecture"
              >
                阅读架构
              </a>
            </div>
          </div>

          <RuntimePanel runtime={runtime} />
        </section>

        <section
          className="border-y border-[var(--line)] bg-[var(--surface)] py-20"
          id="architecture"
        >
          <div className="page-shell grid gap-12 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <h2 className="max-w-[12ch] text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                领域规则和外部服务彻底分开
              </h2>
              <p className="mt-5 max-w-[36rem] leading-7 text-[var(--muted)]">
                核心模块只描述业务规则，支付、存储、邮件、转码和监控通过 Provider 接入。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {domains.map((domain) => (
                <div
                  className="grid min-h-24 place-items-end rounded-xl border border-[var(--line)] bg-[var(--page)] p-4 text-left font-mono text-sm font-semibold"
                  key={domain}
                >
                  <span className="w-full">{domain}</span>
                </div>
              ))}
              <div className="col-span-2 rounded-xl bg-[var(--accent)] p-5 text-[var(--accent-ink)] sm:col-span-4">
                <p className="font-mono text-xs opacity-80">FEATURE FLAGS</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                  {enabledFeatureCount} 项 Demo 能力已启用
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="page-shell py-20" id="commerce">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              两套付费路径，一套权益事实源
            </h2>
            <p className="mt-5 leading-7 text-[var(--muted)]">
              商品由服务端定义，支付成功后统一授予可审计的 Entitlement。
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            {productsConfig.map((product, index) => (
              <article
                className={
                  index === 0
                    ? "rounded-2xl bg-[var(--accent)] p-7 text-[var(--accent-ink)]"
                    : "rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7"
                }
                key={product.id}
              >
                <p className="font-mono text-xs opacity-70">
                  {product.entitlement.type}
                </p>
                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
                  {product.title}
                </h3>
                <p className="mt-3 max-w-[32rem] leading-7 opacity-75">
                  {product.description}
                </p>
                <p className="mt-10 font-mono text-sm">
                  服务端 SKU：{product.id}
                </p>
                <Link
                  className="mt-5 inline-block rounded-lg border border-current px-4 py-2 text-sm font-semibold"
                  href="/pricing"
                >
                  查看价格与购买
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] py-8">
        <div className="page-shell flex flex-col gap-2 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>{site.name}</p>
          <p>Apache-2.0 licensed</p>
        </div>
      </footer>
    </>
  );
}
