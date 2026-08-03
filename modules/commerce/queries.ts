import type { Currency } from "@/modules/commerce";
import type { EntitlementType } from "@/modules/entitlement";

export interface AdminProductDto {
  id: string;
  sku: string;
  title: string;
  description: string;
  amountInMinorUnits: number;
  currency: Currency;
  entitlementType: EntitlementType;
  entitlementTargetId: string | null;
  entitlementDurationDays: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductTargetDto {
  id: string;
  title: string;
  status: string;
}

export interface AdminProductWorkspaceDto {
  products: AdminProductDto[];
  targets: {
    courses: ProductTargetDto[];
    series: ProductTargetDto[];
  };
}

export interface CommerceQueryRepository {
  getAdminProductWorkspace(): Promise<AdminProductWorkspaceDto>;
}
