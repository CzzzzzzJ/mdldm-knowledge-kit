"use client";

import { useEffect, useState } from "react";

interface AdminOrder {
  id: string;
  orderNumber: string;
  user: { name: string; email: string } | null;
  status: string;
  fulfillmentStatus: string;
  provider: string;
  paymentMethod: string;
  amountInMinorUnits: number;
  currency: string;
  lastError: string | null;
  createdAt: string;
  items: Array<{ sku: string; title: string }>;
}

export function AdminOrderManager() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadOrders() {
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const payload = (await response.json()) as {
      orders?: AdminOrder[];
      error?: string;
    };
    if (!response.ok || !payload.orders) {
      throw new Error(payload.error ?? "读取订单失败");
    }
    setOrders(payload.orders);
  }

  useEffect(() => {
    void loadOrders().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "读取订单失败");
    });
  }, []);

  async function mutate(orderId: string, action: "confirm" | "retry") {
    setBusyId(orderId);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/orders/${orderId}/${action}`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "订单操作失败");
      }
      await loadOrders();
      setMessage(action === "confirm" ? "订单已确认并发放权益。" : "授权已重试。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "订单操作失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-[var(--accent)]">COMMERCE</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            订单与权益发放
          </h2>
        </div>
        <p aria-live="polite" className="text-sm text-[var(--muted)]">
          {message || `${orders.length} 笔最近订单`}
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {orders.length === 0 ? (
          <div className="surface p-6 text-[var(--muted)]">暂无订单。</div>
        ) : (
          orders.map((order) => (
            <article
              className="surface grid gap-4 p-5 lg:grid-cols-[1.2fr_0.9fr_auto] lg:items-center"
              key={order.id}
            >
              <div>
                <p className="font-mono text-xs text-[var(--muted)]">
                  {order.orderNumber}
                </p>
                <p className="mt-2 font-semibold">
                  {order.items.map((item) => item.title).join("、")}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {order.user?.email ?? "用户已不存在"}
                </p>
              </div>
              <div className="text-sm">
                <p>
                  ¥{(order.amountInMinorUnits / 100).toFixed(2)} ·{" "}
                  {order.provider}/{order.paymentMethod}
                </p>
                <p className="mt-1 font-mono text-xs text-[var(--accent)]">
                  {order.status} / {order.fulfillmentStatus}
                </p>
                {order.lastError ? (
                  <p className="mt-1 text-xs text-red-600">{order.lastError}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                {order.provider === "manual" && order.status === "pending" ? (
                  <button
                    className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
                    disabled={busyId === order.id}
                    onClick={() => void mutate(order.id, "confirm")}
                    type="button"
                  >
                    确认到账
                  </button>
                ) : null}
                {order.status === "paid" &&
                order.fulfillmentStatus === "failed" ? (
                  <button
                    className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
                    disabled={busyId === order.id}
                    onClick={() => void mutate(order.id, "retry")}
                    type="button"
                  >
                    重试授权
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
