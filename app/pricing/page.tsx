import type { Metadata } from "next";

import { requirePublicSiteAccess } from "@/app/lib/site-launch-guard";
import { CheckoutPanel } from "@/components/checkout-panel";
import {
  MdldmAccessBadge,
  MdldmFooter,
  MdldmPageIntro,
  MdldmPanel,
} from "@/components/mdldm-ui";
import { SiteHeader } from "@/components/site-header";
import { listActiveProducts } from "@/app/lib/commerce-service";
import { getSiteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/providers/auth/session";
import { getPaymentProvider } from "@/providers/payment";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "价格与购买",
};

export default async function PricingPage() {
  await requirePublicSiteAccess();
  const site = getSiteConfig();
  const user = await getCurrentUser();
  const provider = getPaymentProvider();
  const products = await listActiveProducts().catch(() => []);

  return (
    <>
      <SiteHeader site={site} />
      <main>
        <section className="bg-grid-pattern border-b-2 border-[var(--ink)] py-12 sm:py-16">
          <div className="page-shell">
            <MdldmPageIntro
              description="经常学习可以选择全站会员，只需要一门内容也可以单独购买。"
              title="选择适合你的学习方式"
            />

            <div
              aria-label="购买方式说明"
              className="mt-10 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]"
            >
              <MdldmPanel className="bg-[var(--accent)] p-7 sm:p-8">
                <MdldmAccessBadge
                  className="md-badge-neutral bg-[var(--surface)]"
                  label="适合持续学习"
                />
                <h2 className="mt-5 text-3xl font-black tracking-[-0.04em]">
                  全站会员
                </h2>
                <p className="mt-4 max-w-xl font-bold leading-7 text-[var(--accent-ink)]">
                  在会员有效期内学习所有会员内容。后续新增的会员课程也会自动开放。
                </p>
              </MdldmPanel>
              <MdldmPanel className="overflow-hidden bg-[var(--surface)]">
                <div className="h-4 border-b-2 border-[var(--ink)] bg-[var(--brand-blue)]" />
                <div className="p-7 sm:p-8">
                  <MdldmAccessBadge label="适合明确目标" />
                  <h2 className="mt-5 text-3xl font-black tracking-[-0.04em]">
                    单课购买
                  </h2>
                  <p className="mt-4 max-w-xl font-medium leading-7 text-[var(--muted)]">
                    只为指定课程付费。访问范围和有效期以商品说明为准，不要求开通会员。
                  </p>
                </div>
              </MdldmPanel>
            </div>
          </div>
        </section>

        <section className="page-shell py-12 sm:py-16">
          <div className="mb-7">
            <h2 className="text-3xl font-black tracking-[-0.04em]">
              当前可选方案
            </h2>
            <p className="mt-2 text-sm font-bold text-[var(--muted)]">
              支付方式由站长配置，当前使用 {provider.name}。
            </p>
          </div>

          <CheckoutPanel
            paymentMethods={[...provider.supportedMethods]}
            products={products.map((product) => ({
              id: product.sku,
              title: product.title,
              description: product.description,
              amountInMinorUnits: product.amountInMinorUnits,
              currency: product.currency,
              entitlementType: product.entitlementType,
              durationDays: product.entitlementDurationDays,
            }))}
            signedIn={user !== null}
          />
        </section>
      </main>
      <MdldmFooter
        siteName={site.name}
        supportEmail={site.creator.supportEmail}
      />
    </>
  );
}
