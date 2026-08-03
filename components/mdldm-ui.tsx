import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

import type { AccessLevel } from "@/modules/catalog";

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}

const accessLabels: Record<AccessLevel, string> = {
  public: "公开",
  registered: "注册可学",
  member: "会员",
  course: "单课",
  series: "系列权益",
};

export function MdldmPanel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={joinClassNames("md-panel", className)} {...props}>
      {children}
    </div>
  );
}

export function MdldmPageIntro({
  title,
  description,
  backHref,
  backLabel,
  children,
  className,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={joinClassNames("max-w-4xl", className)}>
      {backHref && backLabel ? (
        <Link className="md-text-link" href={backHref}>
          {backLabel}
        </Link>
      ) : null}
      <h1 className="mt-4 text-4xl font-black leading-[1.06] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-[var(--muted)] sm:text-lg">
          {description}
        </p>
      ) : null}
      {children}
    </header>
  );
}

export function MdldmSectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClassNames(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        <h2 className="text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-xl font-medium leading-7 text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type ActionVariant = "primary" | "secondary" | "accent" | "quiet";

const actionVariantClasses: Record<ActionVariant, string> = {
  primary: "md-action md-action-primary",
  secondary: "md-action md-action-secondary",
  accent: "md-action md-action-accent",
  quiet: "md-action md-action-quiet",
};

export function MdldmActionLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: ActionVariant;
  className?: string;
}) {
  return (
    <Link
      className={joinClassNames(actionVariantClasses[variant], className)}
      href={href}
    >
      {children}
    </Link>
  );
}

export function MdldmButton({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionVariant;
}) {
  return (
    <button
      className={joinClassNames(actionVariantClasses[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function MdldmAccessBadge({
  level,
  label,
  className,
}: {
  level?: AccessLevel;
  label?: string;
  className?: string;
}) {
  return (
    <span className={joinClassNames("md-badge", className)}>
      {label ?? (level ? accessLabels[level] : "课程")}
    </span>
  );
}

export function MdldmCourseCover({
  title,
  imageUrl,
  eager = false,
  className,
  compact = false,
}: {
  title: string;
  imageUrl?: string | null;
  eager?: boolean;
  className?: string;
  compact?: boolean;
}) {
  if (imageUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        alt={`${title}封面`}
        className={joinClassNames(
          "w-full object-cover",
          compact ? "aspect-[16/7]" : "aspect-[4/3]",
          className,
        )}
        fetchPriority={eager ? "high" : undefined}
        height={compact ? 700 : 900}
        loading={eager ? "eager" : "lazy"}
        src={imageUrl}
        width={compact ? 1600 : 1200}
      />
    );
  }

  return (
    <div
      aria-label={`${title}课程封面`}
      className={joinClassNames(
        "md-course-cover",
        compact ? "aspect-[16/7]" : "aspect-[4/3]",
        className,
      )}
      role="img"
    >
      <span aria-hidden="true" className="md-cover-circle" />
      <span aria-hidden="true" className="md-cover-square" />
      <strong>{title}</strong>
    </div>
  );
}

export interface MdldmSeriesCardProps {
  title: string;
  description: string;
  href: string;
  accessLevel: AccessLevel;
  category?: string;
  courseCount?: number;
  coverImageUrl?: string | null;
  tags?: string[];
  featured?: boolean;
}

export function MdldmSeriesCard({
  title,
  description,
  href,
  accessLevel,
  category,
  courseCount,
  coverImageUrl,
  tags = [],
  featured = false,
}: MdldmSeriesCardProps) {
  return (
    <article
      className={joinClassNames(
        "md-series-card",
        featured && "md-series-card-featured",
      )}
    >
      <MdldmCourseCover
        className="md-cover-divider border-b-2 border-[var(--ink)]"
        compact
        imageUrl={coverImageUrl}
        title={title}
      />
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <MdldmAccessBadge level={accessLevel} />
          <span className="text-sm font-bold text-[var(--muted)]">
            {category || "课程系列"}
            {typeof courseCount === "number" ? ` / ${courseCount} 节` : ""}
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-black leading-tight tracking-[-0.035em] sm:text-3xl">
          <Link
            className="focus-ring rounded-md underline-offset-4 hover:underline"
            href={href}
          >
            {title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 font-medium leading-7 text-[var(--muted)]">
          {description}
        </p>
        {tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2" aria-label="系列标签">
            {tags.slice(0, 4).map((tag) => (
              <span className="md-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <Link
          className="md-text-link mt-6"
          href={href}
        >
          查看系列
        </Link>
      </div>
    </article>
  );
}

export function MdldmEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <MdldmPanel className={joinClassNames("p-7 sm:p-8", className)}>
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-2 max-w-xl font-medium leading-7 text-[var(--muted)]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </MdldmPanel>
  );
}

export function MdldmFooter({
  siteName,
  supportEmail,
}: {
  siteName: string;
  supportEmail: string;
}) {
  return (
    <footer className="md-footer border-t-2 border-[var(--ink)] bg-[var(--surface)] py-8">
      <div className="page-shell flex flex-col gap-3 text-sm font-bold text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>{siteName}</p>
        <a className="md-text-link" href={`mailto:${supportEmail}`}>
          联系站长
        </a>
      </div>
    </footer>
  );
}
