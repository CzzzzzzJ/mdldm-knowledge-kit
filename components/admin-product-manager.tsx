"use client";

import { useState, type FormEvent } from "react";

type EntitlementType = "membership" | "course" | "series";

interface ProductView {
  id: string;
  sku: string;
  title: string;
  description: string;
  amountInMinorUnits: number;
  currency: "CNY";
  entitlementType: EntitlementType;
  entitlementTargetId: string | null;
  entitlementDurationDays: number | null;
  active: boolean;
}

interface TargetOption {
  id: string;
  title: string;
  status: string;
}

interface ProductTargets {
  courses: TargetOption[];
  series: TargetOption[];
}

interface ProductPayload {
  title: string;
  description: string;
  amountInMinorUnits: number;
  currency: "CNY";
  entitlementType: EntitlementType;
  entitlementTargetId: string | null;
  entitlementDurationDays: number | null;
  active: boolean;
}

function buildProductPayload(
  form: FormData,
  entitlementType: EntitlementType,
): ProductPayload {
  const duration = String(form.get("entitlementDurationDays") ?? "").trim();

  return {
    title: String(form.get("title") ?? ""),
    description: String(form.get("description") ?? ""),
    amountInMinorUnits: Number(form.get("amountInMinorUnits")),
    currency: "CNY",
    entitlementType,
    entitlementTargetId:
      entitlementType === "membership"
        ? null
        : String(form.get("entitlementTargetId") ?? ""),
    entitlementDurationDays: duration === "" ? null : Number(duration),
    active: form.get("active") === "on",
  };
}

async function readResponse(response: Response) {
  return (await response.json().catch(() => null)) as {
    error?: string;
    issues?: Array<{ path: string; message: string }>;
  } | null;
}

function TargetSelect({
  type,
  targets,
  defaultValue,
  inputClass,
}: {
  type: EntitlementType;
  targets: ProductTargets;
  defaultValue?: string | null;
  inputClass: string;
}) {
  if (type === "membership") {
    return (
      <p className="rounded-lg bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted)]">
        全站会员不绑定某一门课。购买后，用户可访问所有要求会员权益的内容。
      </p>
    );
  }

  const options = type === "course" ? targets.courses : targets.series;
  const selectedTargetExists = options.some(
    (option) => option.id === defaultValue,
  );

  return (
    <label className="grid gap-2 text-sm font-medium">
      {type === "course" ? "绑定课程" : "绑定系列"}
      <select
        className={inputClass}
        defaultValue={defaultValue ?? ""}
        name="entitlementTargetId"
        required
      >
        <option disabled value="">
          {options.length === 0
            ? `请先创建${type === "course" ? "课时" : "系列"}`
            : `选择${type === "course" ? "课时" : "系列"}`}
        </option>
        {!selectedTargetExists && defaultValue ? (
          <option value={defaultValue}>当前目标已不存在，请重新选择</option>
        ) : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.title}（{option.status === "published" ? "已发布" : "草稿"}）
          </option>
        ))}
      </select>
      <span className="text-xs font-normal leading-5 text-[var(--muted)]">
        {type === "course"
          ? "该商品只授予所选课时的访问权益。"
          : "该商品授予所选系列的访问权益，适合整套课程销售。"}
      </span>
    </label>
  );
}

function ProductEditor({
  product,
  targets,
  busy,
  onSubmit,
}: {
  product: ProductView;
  targets: ProductTargets;
  busy: boolean;
  onSubmit: (
    productId: string,
    entitlementType: EntitlementType,
    event: FormEvent<HTMLFormElement>,
  ) => void;
}) {
  const [entitlementType, setEntitlementType] =
    useState<EntitlementType>(product.entitlementType);
  const inputClass =
    "focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--page)] px-3.5 py-2.5";

  return (
    <form
      className="surface grid gap-5 p-6"
      onSubmit={(event) => onSubmit(product.id, entitlementType, event)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{product.title}</p>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">
            SKU: {product.sku}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            product.active
              ? "bg-[var(--surface-strong)] text-[var(--ink)]"
              : "border border-[var(--line)] text-[var(--muted)]"
          }`}
        >
          {product.active ? "已上架" : "已下架"}
        </span>
      </div>

      <p className="text-xs leading-5 text-[var(--muted)]">
        SKU 用于下单和订单快照，创建后不能修改。标题、价格和权益的更新只影响之后的新订单。
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          商品标题
          <input
            className={inputClass}
            defaultValue={product.title}
            maxLength={120}
            name="title"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          价格（分）
          <input
            className={inputClass}
            defaultValue={product.amountInMinorUnits}
            min={1}
            name="amountInMinorUnits"
            required
            step={1}
            type="number"
          />
          <span className="text-xs font-normal text-[var(--muted)]">
            例如 9900 分等于 ¥99.00。
          </span>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        商品说明
        <textarea
          className={inputClass}
          defaultValue={product.description}
          maxLength={2_000}
          name="description"
          required
          rows={3}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          销售模式
          <select
            className={inputClass}
            name="entitlementType"
            onChange={(event) =>
              setEntitlementType(event.currentTarget.value as EntitlementType)
            }
            value={entitlementType}
          >
            <option value="membership">全站会员</option>
            <option value="course">单课购买</option>
            <option value="series">系列购买</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          权益期限（天）
          <input
            className={inputClass}
            defaultValue={product.entitlementDurationDays ?? ""}
            max={36_500}
            min={1}
            name="entitlementDurationDays"
            placeholder="留空表示永久"
            step={1}
            type="number"
          />
          <span className="text-xs font-normal text-[var(--muted)]">
            会员常用 30 或 365 天，单课和系列可以留空设为永久。
          </span>
        </label>
      </div>

      <TargetSelect
        defaultValue={
          entitlementType === product.entitlementType
            ? product.entitlementTargetId
            : null
        }
        inputClass={inputClass}
        key={entitlementType}
        targets={targets}
        type={entitlementType}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-4">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input defaultChecked={product.active} name="active" type="checkbox" />
          允许用户购买
        </label>
        <button
          className="focus-ring rounded-lg bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--accent-ink)] active:translate-y-px disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          保存商品
        </button>
      </div>
    </form>
  );
}

export function AdminProductManager({
  products,
  targets,
}: {
  products: ProductView[];
  targets: ProductTargets;
}) {
  const [createType, setCreateType] =
    useState<EntitlementType>("membership");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "商品价格和权益由数据库中的 Product 决定，前台下单不能提交金额。",
  );
  const inputClass =
    "focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--page)] px-3.5 py-2.5";

  async function run(action: () => Promise<Response>, successMessage: string) {
    setBusy(true);
    setMessage("");

    try {
      const response = await action();
      const payload = await readResponse(response);
      if (!response.ok) {
        const issue = payload?.issues?.[0]?.message;
        throw new Error(issue ?? payload?.error ?? "商品保存失败");
      }

      setMessage(successMessage);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "商品保存失败");
      setBusy(false);
    }
  }

  function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    void run(
      () =>
        fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: String(form.get("sku") ?? ""),
            ...buildProductPayload(form, createType),
          }),
        }),
      "商品已创建。",
    );
  }

  function updateProduct(
    productId: string,
    entitlementType: EntitlementType,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    void run(
      () =>
        fetch(`/api/admin/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildProductPayload(form, entitlementType)),
        }),
      "商品已更新。新价格和权益会用于之后的订单。",
    );
  }

  return (
    <div className="mt-10 grid gap-8">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface p-6">
          <h2 className="text-xl font-semibold">先确定卖什么</h2>
          <div className="mt-5 grid gap-4">
            <div>
              <p className="font-semibold">全站会员</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                按期限开放所有会员内容，不需要绑定具体课程。
              </p>
            </div>
            <div>
              <p className="font-semibold">单课购买</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                只开放指定课时，适合独立售卖一门课或一个付费内容。
              </p>
            </div>
            <div>
              <p className="font-semibold">系列购买</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                开放指定系列，适合把一组连续课程作为一个产品销售。
              </p>
            </div>
          </div>
        </div>
        <aside className="rounded-xl bg-[var(--surface-strong)] p-6">
          <h2 className="text-lg font-semibold">定价安全边界</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            用户下单时只提交 SKU。服务端从 Product 读取标题、价格、币种、权益目标和期限，并把当时的数据保存进订单快照。
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            商品更新不会改写历史订单。需要暂停售卖时请下架，不要复用旧 SKU 创建不同含义的商品。
          </p>
        </aside>
      </section>

      <p
        aria-live="polite"
        className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--muted)]"
      >
        {message}
      </p>

      <form className="surface grid gap-5 p-6" onSubmit={createProduct}>
        <div>
          <h2 className="text-xl font-semibold">创建商品</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            SKU 创建后不可修改。建议使用清晰的小写英文，例如 membership-yearly。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            SKU
            <input
              className={inputClass}
              maxLength={120}
              name="sku"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="membership-yearly"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            商品标题
            <input
              className={inputClass}
              maxLength={120}
              name="title"
              placeholder="全站年度会员"
              required
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          商品说明
          <textarea
            className={inputClass}
            maxLength={2_000}
            name="description"
            placeholder="说明用户购买后能获得什么。"
            required
            rows={3}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium">
            价格（分）
            <input
              className={inputClass}
              min={1}
              name="amountInMinorUnits"
              placeholder="9900"
              required
              step={1}
              type="number"
            />
            <span className="text-xs font-normal text-[var(--muted)]">
              9900 分等于 ¥99.00。
            </span>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            币种
            <select className={inputClass} disabled name="currency" value="CNY">
              <option value="CNY">CNY 人民币</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            权益期限（天）
            <input
              className={inputClass}
              max={36_500}
              min={1}
              name="entitlementDurationDays"
              placeholder="留空表示永久"
              step={1}
              type="number"
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          销售模式
          <select
            className={inputClass}
            name="entitlementType"
            onChange={(event) =>
              setCreateType(event.currentTarget.value as EntitlementType)
            }
            value={createType}
          >
            <option value="membership">全站会员</option>
            <option value="course">单课购买</option>
            <option value="series">系列购买</option>
          </select>
        </label>

        <TargetSelect
          inputClass={inputClass}
          key={createType}
          targets={targets}
          type={createType}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-4">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input defaultChecked name="active" type="checkbox" />
            创建后立即上架
          </label>
          <button
            className="focus-ring rounded-lg bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--accent-ink)] active:translate-y-px disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            创建商品
          </button>
        </div>
      </form>

      <section>
        <div>
          <h2 className="text-2xl font-semibold">现有商品</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            共 {products.length} 个商品。下架商品会保留历史订单，但不会出现在购买入口。
          </p>
        </div>

        {products.length === 0 ? (
          <div className="surface mt-5 p-8 text-center">
            <p className="font-semibold">还没有商品</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              使用上方表单创建第一个会员、单课或系列商品。
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {products.map((product) => (
              <ProductEditor
                busy={busy}
                key={product.id}
                onSubmit={updateProduct}
                product={product}
                targets={targets}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
