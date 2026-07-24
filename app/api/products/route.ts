import { NextResponse } from "next/server";

import { listActiveProducts } from "@/app/lib/commerce-service";
import { getPaymentProvider } from "@/providers/payment";

export const dynamic = "force-dynamic";

export async function GET() {
  const [products, provider] = await Promise.all([
    listActiveProducts(),
    Promise.resolve(getPaymentProvider()),
  ]);

  return NextResponse.json(
    {
      provider: provider.name,
      paymentMethods: provider.supportedMethods,
      products: products.map((product) => ({
        id: product.sku,
        title: product.title,
        description: product.description,
        price: {
          amountInMinorUnits: product.amountInMinorUnits,
          currency: product.currency,
        },
        entitlement: {
          type: product.entitlementType,
          durationDays: product.entitlementDurationDays,
        },
      })),
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
