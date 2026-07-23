import { describe, expect, it } from "vitest";

import { productsConfig } from "@/config/products.config";

describe("server product catalog", () => {
  it("contains both accepted v0.1 payment modes", () => {
    expect(productsConfig.map((product) => product.entitlement.type)).toEqual(
      expect.arrayContaining(["membership", "course"]),
    );
  });

  it("uses positive server-side minor-unit prices", () => {
    for (const product of productsConfig) {
      expect(product.price.amountInMinorUnits).toBeGreaterThan(0);
      expect(product.price.currency).toBe("CNY");
    }
  });
});
