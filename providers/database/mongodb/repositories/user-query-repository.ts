import { isValidObjectId } from "mongoose";

import type { UserQueryRepository } from "@/modules/identity";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  OrderItemModel,
  OrderModel,
  type OrderRecord,
} from "@/providers/database/mongodb/models/commerce";
import { UserModel } from "@/providers/database/mongodb/models/user";

export function createMongoUserQueryRepository(): UserQueryRepository {
  type OrderView = OrderRecord & { _id: { toString(): string } };

  async function serializeOrders(
    orders: OrderView[],
  ) {
    const items = await OrderItemModel.find({
      orderId: { $in: orders.map((order) => order._id) },
    }).lean();
    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      const orderId = item.orderId.toString();
      itemsByOrder.set(orderId, [
        ...(itemsByOrder.get(orderId) ?? []),
        item,
      ]);
    }

    return orders.map((order) => {
      const orderItems = itemsByOrder.get(order._id.toString()) ?? [];
      return {
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        titles: orderItems.map((item) => item.title),
        amountInMinorUnits: order.amountInMinorUnits,
        currency: order.currency,
        provider: order.provider,
        paymentMethod: order.paymentMethod,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        expiresAt: order.expiresAt?.toISOString() ?? null,
        paidAt: order.paidAt?.toISOString() ?? null,
        fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        items: orderItems.map((item) => ({
          sku: item.sku,
          title: item.title,
          quantity: item.quantity,
          entitlementType: item.entitlementType,
          entitlementGranted: item.entitlementId !== null,
        })),
      };
    });
  }

  return {
    async listAdminUsers(limit) {
      await connectMongo();
      const users = await UserModel.find()
        .select("name email role status emailVerified createdAt")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return users.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      }));
    },

    async listOrdersForUser(userId, limit) {
      if (!isValidObjectId(userId)) return [];
      await connectMongo();
      const orders = await OrderModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return serializeOrders(orders as OrderView[]);
    },

    async findOrderForUser(userId, orderId) {
      if (!isValidObjectId(userId) || !isValidObjectId(orderId)) return null;
      await connectMongo();
      const order = await OrderModel.findOne({ _id: orderId, userId }).lean();
      if (!order) return null;
      return (await serializeOrders([order as OrderView]))[0] ?? null;
    },
  };
}
