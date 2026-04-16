export type RepairPricingInput = {
  sale_price_without_iva?: number | string | null;
  iva_percentage?: number | string | null;
  sale_price_with_iva?: number | string | null;
  sale_price?: number | string | null;
};

export type ResolvedRepairPricing = {
  sale_price_without_iva: number;
  iva_percentage: number;
  sale_price_with_iva: number;
};

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateGrossFromNet(net: number, ivaPercentage: number): number {
  return roundCurrency(net * (1 + ivaPercentage / 100));
}

export function calculateNetFromGross(gross: number, ivaPercentage: number): number {
  const divisor = 1 + ivaPercentage / 100;
  if (divisor <= 0) return roundCurrency(gross);
  return roundCurrency(gross / divisor);
}

function toNumericOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveRepairPricing(input: RepairPricingInput): ResolvedRepairPricing {
  const ivaPercentage = toNumericOrNull(input.iva_percentage) ?? 21;
  const net = toNumericOrNull(input.sale_price_without_iva);
  const grossSource =
    toNumericOrNull(input.sale_price_with_iva) ?? toNumericOrNull(input.sale_price);

  if (net !== null) {
    return {
      sale_price_without_iva: roundCurrency(net),
      iva_percentage: roundCurrency(ivaPercentage),
      sale_price_with_iva: calculateGrossFromNet(net, ivaPercentage),
    };
  }

  if (grossSource !== null) {
    return {
      sale_price_without_iva: calculateNetFromGross(grossSource, ivaPercentage),
      iva_percentage: roundCurrency(ivaPercentage),
      sale_price_with_iva: roundCurrency(grossSource),
    };
  }

  return {
    sale_price_without_iva: 0,
    iva_percentage: roundCurrency(ivaPercentage),
    sale_price_with_iva: 0,
  };
}

export type ChargeWithIvaMode = "with_iva" | "without_iva";

export function resolvePaymentAmountByMode(
  pricing: Pick<ResolvedRepairPricing, "sale_price_without_iva" | "sale_price_with_iva">,
  chargeMode: ChargeWithIvaMode
): number {
  return chargeMode === "with_iva"
    ? roundCurrency(pricing.sale_price_with_iva)
    : roundCurrency(pricing.sale_price_without_iva);
}
