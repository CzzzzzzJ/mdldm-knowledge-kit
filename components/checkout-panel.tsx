"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface ProductView {
  id: string;
  title: string;
  description: string;
  amountInMinorUnits: number;
  currency: "CNY";
  entitlementType: string;
  durationDays: number | null;
}

interface CheckoutResult {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    fulfillmentStatus: string;
  };
  checkout: {
    mode: "instructions" | "mock" | "payment_url";
    paymentUrl: string | null;
    qrContent: string | null;
    instructions: string | null;
    expiresAt: string | null;
  };
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amount / 100);
}

export function CheckoutPanel({
  products,
  paymentMethods,
  signedIn,
}: {
  products: ProductView[];
  paymentMethods: string[];
  signedIn: boolean;
}) {
  const [selectedProduct, setSelectedProduct] = useState(
    products[0]?.id ?? "",
  );
  const [paymentMethod, setPaymentMethod] = useState(
    paymentMethods[0] ?? "",
  );
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => products.find((product) => product.id === selectedProduct),
    [products, selectedProduct],
  );

  useEffect(() => {
    if (!result || orderStatus === "fulfilled") {
      return;
    }

    const timer = window.setInterval(() => {
      void fetch(`/api/orders/${result.order.id}`, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }
          const payload = (await response.json()) as {
            order: { status: string; fulfillmentStatus: string };
          };
          setOrderStatus(payload.order.status);
          if (payload.order.fulfillmentStatus === "fulfilled") {
            setMessage("支付已确认，权益已经发放。");
          }
        })
        .catch(() => undefined);
    }, 3_000);

    return () => window.clearInterval(timer);
  }, [orderStatus, result]);

  async function createOrder() {
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct,
          paymentMethod,
        }),
      });
      const payload = (await response.json()) as CheckoutResult & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "创建订单失败");
      }
      setResult(payload);
      setOrderStatus(payload.order.status);
      setMessage("订单已创建，金额来自服务端商品快照。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建订单失败");
    } finally {
      setBusy(false);
    }
  }

  async function confirmMockPayment() {
    if (!result) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/payments/mock/${result.order.id}/confirm`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Mock 支付确认失败");
      }
      setOrderStatus("fulfilled");
      setMessage("Mock 支付已确认，权益已经幂等发放。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "支付确认失败");
    } finally {
      setBusy(false);
    }
  }

  if (products.length === 0) {
    return (
      <section className="surface mt-10 p-7">
        <h2 className="text-xl font-semibold">暂无可售商品</h2>
        <p className="mt-2 text-[var(--muted)]">
          请先运行 Demo Seed，或在服务端商品配置中启用商品。
        </p>
      </section>
    );
  }

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <section className="grid gap-4">
        {products.map((product) => (
          <button
            className={`surface focus-ring p-6 text-left transition-transform hover:-translate-y-0.5 ${
              selectedProduct === product.id
                ? "outline outline-2 outline-[var(--accent)]"
                : ""
            }`}
            key={product.id}
            onClick={() => setSelectedProduct(product.id)}
            type="button"
          >
            <span className="font-mono text-xs text-[var(--accent)]">
              {product.entitlementType}
            </span>
            <span className="mt-3 block text-2xl font-semibold">
              {product.title}
            </span>
            <span className="mt-2 block leading-7 text-[var(--muted)]">
              {product.description}
            </span>
            <span className="mt-5 block text-xl font-semibold">
              {formatPrice(product.amountInMinorUnits)}
            </span>
          </button>
        ))}
      </section>

      <aside className="surface h-fit p-7">
        <p className="font-mono text-xs text-[var(--accent)]">CHECKOUT</p>
        <h2 className="mt-3 text-2xl font-semibold">
          {selected?.title ?? "选择商品"}
        </h2>

        <label className="mt-6 grid gap-2 text-sm">
          支付方式
          <select
            className="focus-ring rounded-lg border border-[var(--line)] bg-[var(--page)] px-3.5 py-2.5"
            onChange={(event) => setPaymentMethod(event.target.value)}
            value={paymentMethod}
          >
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>

        {signedIn ? (
          <button
            className="mt-5 w-full rounded-lg bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-ink)]"
            disabled={busy || !selectedProduct || !paymentMethod}
            onClick={() => void createOrder()}
            type="button"
          >
            {busy ? "处理中…" : "按服务端价格创建订单"}
          </button>
        ) : (
          <Link
            className="mt-5 block rounded-lg bg-[var(--accent)] px-4 py-3 text-center font-semibold text-[var(--accent-ink)]"
            href="/login?next=/pricing"
          >
            登录后购买
          </Link>
        )}

        <p aria-live="polite" className="mt-4 text-sm text-[var(--muted)]">
          {message || "浏览器不会提交或决定最终金额。"}
        </p>

        {result ? (
          <div className="mt-6 border-t border-[var(--line)] pt-6">
            <p className="font-mono text-xs text-[var(--muted)]">
              {result.order.orderNumber}
            </p>
            <p className="mt-2 text-sm">
              订单状态：{orderStatus ?? result.order.status}
            </p>

            {result.checkout.qrContent ? (
              <div className="mt-5 inline-block rounded-xl bg-white p-3">
                <QRCodeSVG
                  bgColor="#ffffff"
                  fgColor="#111827"
                  size={196}
                  value={result.checkout.qrContent}
                />
              </div>
            ) : null}

            {result.checkout.instructions ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                {result.checkout.instructions}
              </p>
            ) : null}

            {result.checkout.paymentUrl ? (
              <a
                className="mt-4 block rounded-lg border border-[var(--line)] px-4 py-2.5 text-center text-sm font-semibold"
                href={result.checkout.paymentUrl}
                rel="noreferrer"
                target="_blank"
              >
                打开支付链接
              </a>
            ) : null}

            {result.checkout.mode === "mock" &&
            orderStatus !== "fulfilled" ? (
              <button
                className="mt-4 w-full rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                disabled={busy}
                onClick={() => void confirmMockPayment()}
                type="button"
              >
                完成 Mock 支付
              </button>
            ) : null}

            <Link
              className="mt-4 block text-sm font-semibold text-[var(--accent)]"
              href="/account/orders"
            >
              查看我的订单 →
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
