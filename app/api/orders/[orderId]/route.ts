import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import { getCurrentUser } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  OrderItemModel,
  OrderModel,
} from "@/providers/database/mongodb/models/commerce";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { orderId } = await context.params;
  if (!isValidObjectId(orderId)) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  await connectMongo();
  const order = await OrderModel.findOne({
    _id: orderId,
    userId: user.id,
  }).lean();
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }
  const items = await OrderItemModel.find({ orderId: order._id }).lean();

  return NextResponse.json(
    {
      order: {
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
        items: items.map((item) => ({
          sku: item.sku,
          title: item.title,
          entitlementType: item.entitlementType,
          entitlementGranted: item.entitlementId !== null,
        })),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
