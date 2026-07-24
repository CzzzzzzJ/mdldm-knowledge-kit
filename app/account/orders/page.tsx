import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getSiteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/providers/auth/session";
import { connectMongo } from "@/providers/database/mongodb/connection";
import {
  OrderItemModel,
  OrderModel,
} from "@/providers/database/mongodb/models/commerce";

export const dynamic = "force-dynamic";

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amount / 100);
}

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/account/orders");
  }

  await connectMongo();
  const orders = await OrderModel.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const items = await OrderItemModel.find({
    orderId: { $in: orders.map((order) => order._id) },
  }).lean();
  const site = getSiteConfig();

  return (
    <>
      <SiteHeader site={site} />
      <main className="page-shell py-16">
        <h1 className="text-5xl font-semibold tracking-[-0.05em]">
          我的订单
        </h1>
        <p className="mt-4 text-[var(--muted)]">{user.email}</p>

        <div className="mt-10 grid gap-4">
          {orders.length === 0 ? (
            <section className="surface p-7">
              <h2 className="text-xl font-semibold">还没有订单</h2>
              <Link
                className="mt-3 inline-block text-[var(--accent)]"
                href="/pricing"
              >
                前往价格页 →
              </Link>
            </section>
          ) : (
            orders.map((order) => {
              const orderItems = items.filter(
                (item) => item.orderId.toString() === order._id.toString(),
              );
              return (
                <article
                  className="surface grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center"
                  key={order._id.toString()}
                >
                  <div>
                    <p className="font-mono text-xs text-[var(--muted)]">
                      {order.orderNumber}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      {orderItems.map((item) => item.title).join("、")}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {order.provider} / {order.paymentMethod} ·{" "}
                      {order.createdAt.toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-xl font-semibold">
                      {formatPrice(order.amountInMinorUnits)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[var(--accent)]">
                      {order.status} / {order.fulfillmentStatus}
                    </p>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
