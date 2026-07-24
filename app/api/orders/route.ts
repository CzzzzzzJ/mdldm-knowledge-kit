import { NextResponse } from "next/server";

import { getCurrentUser } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  OrderItemModel,
  OrderModel,
} from "@/providers/database/mongodb/models/commerce";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  await connectMongo();
  const orders = await OrderModel.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const items = await OrderItemModel.find({
    orderId: { $in: orders.map((order) => order._id) },
  }).lean();
  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.orderId.toString();
    itemsByOrder.set(key, [...(itemsByOrder.get(key) ?? []), item]);
  }

  return NextResponse.json(
    {
      orders: orders.map((order) => ({
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        provider: order.provider,
        paymentMethod: order.paymentMethod,
        amountInMinorUnits: order.amountInMinorUnits,
        currency: order.currency,
        expiresAt: order.expiresAt?.toISOString() ?? null,
        paidAt: order.paidAt?.toISOString() ?? null,
        fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        items: (itemsByOrder.get(order._id.toString()) ?? []).map((item) => ({
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
