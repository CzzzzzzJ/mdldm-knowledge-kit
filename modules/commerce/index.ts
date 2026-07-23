import type { EntitlementType } from "@/modules/entitlement";

export interface ProductDefinition {
  id: string;
  title: string;
  description: string;
  price: {
    amountInMinorUnits: number;
    currency: "CNY";
  };
  entitlement: {
    type: EntitlementType;
    targetId: string | null;
    durationDays: number | null;
  };
  active: boolean;
}
