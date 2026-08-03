"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import {
  MdldmAccessBadge,
  MdldmActionLink,
  MdldmButton,
  MdldmPanel,
} from "@/components/mdldm-ui";

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
      <MdldmPanel className="p-7">
        <h2 className="text-xl font-black">暂无可售商品</h2>
        <p className="mt-2 font-medium text-[var(--muted)]">
          请先运行 Demo Seed，或在服务端商品配置中启用商品。
        </p>
      </MdldmPanel>
    );
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_0.85fr]">
      <section className="grid gap-4">
        {products.map((product) => (
          <button
            className={`focus-ring md-pressable rounded-2xl border-2 border-[var(--ink)] p-6 text-left shadow-[5px_5px_0_var(--hard-shadow)] ${
              selectedProduct === product.id
                ? "bg-[var(--accent)]"
                : "bg-[var(--surface)]"
            }`}
            key={product.id}
            onClick={() => setSelectedProduct(product.id)}
            type="button"
          >
            <MdldmAccessBadge label={product.entitlementType} />
            <span className="mt-4 block text-2xl font-black tracking-[-0.03em]">
              {product.title}
            </span>
            <span className="mt-2 block font-medium leading-7 text-[var(--muted)]">
              {product.description}
            </span>
            <span className="mt-5 block text-2xl font-black">
              {formatPrice(product.amountInMinorUnits)}
            </span>
          </button>
        ))}
      </section>

      <aside className="h-fit">
        <MdldmPanel className="overflow-hidden">
          <div className="border-b-2 border-[var(--ink)] bg-[var(--ink)] px-7 py-4 text-sm font-black text-[var(--surface)]">
            安全结算
          </div>
          <div className="p-7">
            <h2 className="text-2xl font-black">
              {selected?.title ?? "选择商品"}
            </h2>

            <label className="mt-6 grid gap-2 text-sm font-black">
              支付方式
              <select
                className="md-field font-medium"
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
              <MdldmButton
                className="mt-5 w-full"
                disabled={busy || !selectedProduct || !paymentMethod}
                onClick={() => void createOrder()}
                type="button"
                variant="accent"
              >
                {busy ? "处理中…" : "按服务端价格创建订单"}
              </MdldmButton>
            ) : (
              <MdldmActionLink
                className="mt-5 w-full"
                href="/login?next=/pricing"
                variant="accent"
              >
                登录后购买
              </MdldmActionLink>
            )}

            <p
              aria-live="polite"
              className="mt-4 text-sm font-medium text-[var(--muted)]"
            >
              {message || "浏览器不会提交或决定最终金额。"}
            </p>

            {result ? (
              <div className="mt-6 border-t-2 border-dashed border-[var(--line-soft)] pt-6">
                <p className="font-mono text-xs font-bold text-[var(--muted)]">
                  {result.order.orderNumber}
                </p>
                <p className="mt-2 text-sm font-bold">
                  订单状态：{orderStatus ?? result.order.status}
                </p>

                {result.checkout.qrContent ? (
                  <div className="mt-5 inline-block rounded-xl border-2 border-[var(--ink)] bg-white p-3 shadow-[4px_4px_0_var(--hard-shadow)]">
                    <QRCodeSVG
                      bgColor="#ffffff"
                      fgColor="#151515"
                      size={196}
                      value={result.checkout.qrContent}
                    />
                  </div>
                ) : null}

                {result.checkout.instructions ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-6 text-[var(--muted)]">
                    {result.checkout.instructions}
                  </p>
                ) : null}

                {result.checkout.paymentUrl ? (
                  <a
                    className="md-action md-action-secondary mt-4 w-full"
                    href={result.checkout.paymentUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    打开支付链接
                  </a>
                ) : null}

                {result.checkout.mode === "mock" &&
                orderStatus !== "fulfilled" ? (
                  <MdldmButton
                    className="mt-4 w-full"
                    disabled={busy}
                    onClick={() => void confirmMockPayment()}
                    type="button"
                    variant="secondary"
                  >
                    完成 Mock 支付
                  </MdldmButton>
                ) : null}

                <Link
                  className="md-text-link mt-5"
                  href="/account/orders"
                >
                  查看我的订单
                </Link>
              </div>
            ) : null}
          </div>
        </MdldmPanel>
      </aside>
    </div>
  );
}
