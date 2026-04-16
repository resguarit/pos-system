import { describe, expect, it } from "vitest";
import {
  calculateGrossFromNet,
  resolvePaymentAmountByMode,
  resolveRepairPricing,
} from "./repairPricing";

describe("repairPricing", () => {
  it("calculates gross from net and iva", () => {
    expect(calculateGrossFromNet(1000, 21)).toBe(1210);
  });

  it("resolves pricing from net input", () => {
    const pricing = resolveRepairPricing({
      sale_price_without_iva: 1000,
      iva_percentage: 21,
    });

    expect(pricing.sale_price_without_iva).toBe(1000);
    expect(pricing.iva_percentage).toBe(21);
    expect(pricing.sale_price_with_iva).toBe(1210);
  });

  it("resolves pricing from legacy gross input", () => {
    const pricing = resolveRepairPricing({
      sale_price: 1210,
      iva_percentage: 21,
    });

    expect(pricing.sale_price_without_iva).toBe(1000);
    expect(pricing.sale_price_with_iva).toBe(1210);
  });

  it("resolves pricing when API returns decimal strings", () => {
    const pricing = resolveRepairPricing({
      sale_price_without_iva: "1000.00",
      iva_percentage: "21.00",
      sale_price_with_iva: "1210.00",
    });

    expect(pricing.sale_price_without_iva).toBe(1000);
    expect(pricing.iva_percentage).toBe(21);
    expect(pricing.sale_price_with_iva).toBe(1210);
  });

  it("returns payment amount based on charge mode", () => {
    const pricing = {
      sale_price_without_iva: 1000,
      sale_price_with_iva: 1210,
    };

    expect(resolvePaymentAmountByMode(pricing, "with_iva")).toBe(1210);
    expect(resolvePaymentAmountByMode(pricing, "without_iva")).toBe(1000);
  });
});
