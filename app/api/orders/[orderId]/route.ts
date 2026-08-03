import { NextResponse } from "next/server";

import { findOrderForUser } from "@/app/lib/user-query-service";
import { getCurrentUser } from "@/providers/auth/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { orderId } = await context.params;
  const order = await findOrderForUser(user.id, orderId);
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  return NextResponse.json(
    {
      order: {
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
          entitlementType: item.entitlementType,
          entitlementGranted: item.entitlementGranted,
        })),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
