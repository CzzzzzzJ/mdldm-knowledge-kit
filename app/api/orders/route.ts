import { NextResponse } from "next/server";

import { listOrdersForUser } from "@/app/lib/user-query-service";
import { getCurrentUser } from "@/providers/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const orders = await listOrdersForUser(user.id);

  return NextResponse.json(
    {
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        provider: order.provider,
        paymentMethod: order.paymentMethod,
        amountInMinorUnits: order.amountInMinorUnits,
        currency: order.currency,
        expiresAt: order.expiresAt,
        paidAt: order.paidAt,
        fulfilledAt: order.fulfilledAt,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          sku: item.sku,
          title: item.title,
          quantity: item.quantity,
          entitlementType: item.entitlementType,
        })),
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
