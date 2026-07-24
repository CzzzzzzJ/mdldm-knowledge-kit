import { NextResponse } from "next/server";

import { requireAdmin } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  OrderItemModel,
  OrderModel,
} from "@/providers/database/mongodb/models/commerce";
import { UserModel } from "@/providers/database/mongodb/models/user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  await connectMongo();
  const orders = await OrderModel.find().sort({ createdAt: -1 }).limit(200).lean();
  const [users, items] = await Promise.all([
    UserModel.find({
      _id: { $in: orders.map((order) => order.userId) },
    })
      .select("name email")
      .lean(),
    OrderItemModel.find({
      orderId: { $in: orders.map((order) => order._id) },
    }).lean(),
  ]);
  const usersById = new Map(
    users.map((user) => [
      user._id.toString(),
      { name: user.name, email: user.email },
    ]),
  );

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      user: usersById.get(order.userId.toString()) ?? null,
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus,
      provider: order.provider,
      paymentMethod: order.paymentMethod,
      amountInMinorUnits: order.amountInMinorUnits,
      currency: order.currency,
      lastError: order.lastError,
      createdAt: order.createdAt.toISOString(),
      items: items
        .filter((item) => item.orderId.toString() === order._id.toString())
        .map((item) => ({ sku: item.sku, title: item.title })),
    })),
  });
}
