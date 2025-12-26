import { Badge } from "@/components/ui/badge";
import React from "react";

interface ConversionStatusBadgeProps {
    convertedFromBudgetId?: number | null;
    convertedFromBudgetReceipt?: string | null;
    convertedToSaleId?: number | null;
    convertedToSaleReceipt?: string | null;
    className?: string;
}

export const ConversionStatusBadge: React.FC<ConversionStatusBadgeProps> = ({
    convertedFromBudgetId,
    convertedFromBudgetReceipt,
    convertedToSaleId,
    convertedToSaleReceipt,
    className = "",
}) => {
    if (convertedToSaleId) {
        const displayValue = convertedToSaleReceipt ? convertedToSaleReceipt.replace(/^#/, '') : convertedToSaleId;
        const titleValue = convertedToSaleReceipt || `#${convertedToSaleId}`;

        return (
            <Badge
                variant="outline"
                className={`text-xs bg-green-50 text-green-700 border-green-300 cursor-help ${className}`}
                title={`Convertido a venta ${titleValue}`}
                aria-label={`Convertido a venta ${titleValue}`}
            >
                →V#{displayValue}
            </Badge>
        );
    }

    if (convertedFromBudgetId) {
        const displayValue = convertedFromBudgetReceipt ? convertedFromBudgetReceipt.replace(/^#/, '') : convertedFromBudgetId;
        const titleValue = convertedFromBudgetReceipt || `#${convertedFromBudgetId}`;

        return (
            <Badge
                variant="outline"
                className={`text-xs bg-purple-50 text-purple-700 border-purple-300 cursor-help ${className}`}
                title={`Convertida desde presupuesto ${titleValue}`}
                aria-label={`Convertida desde presupuesto ${titleValue}`}
            >
                P#{displayValue}
            </Badge>
        );
    }

    return null;
};
