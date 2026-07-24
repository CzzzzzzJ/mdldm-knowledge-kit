import type { Metadata } from "next";

import { CheckoutPanel } from "@/components/checkout-panel";
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
  const site = getSiteConfig();
  const user = await getCurrentUser();
  const provider = getPaymentProvider();
  const products = await listActiveProducts().catch(() => []);

  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-16">
        <p className="font-mono text-xs text-[var(--accent)]">
          {provider.name.toUpperCase()} PAYMENT
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
          选择你的权益
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          全站会员和单课购买共用同一套订单、支付事件与权益发放流程。
        </p>

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
      </main>
    </>
  );
}
