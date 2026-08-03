import type { UserRole, UserStatus } from "@/modules/identity";
import type {
  Currency,
  FulfillmentStatus,
  OrderStatus,
  PaymentProviderName,
} from "@/modules/commerce";
import type { EntitlementType } from "@/modules/entitlement";

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface UserOrderDto {
  id: string;
  orderNumber: string;
  titles: string[];
  amountInMinorUnits: number;
  currency: Currency;
  provider: PaymentProviderName;
  paymentMethod: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  expiresAt: string | null;
  paidAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  items: Array<{
    sku: string;
    title: string;
    quantity: number;
    entitlementType: EntitlementType;
    entitlementGranted: boolean;
  }>;
}

export interface UserQueryRepository {
  listAdminUsers(limit: number): Promise<AdminUserDto[]>;
  listOrdersForUser(userId: string, limit: number): Promise<UserOrderDto[]>;
  findOrderForUser(userId: string, orderId: string): Promise<UserOrderDto | null>;
}
