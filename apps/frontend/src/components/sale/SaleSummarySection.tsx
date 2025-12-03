import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { formatCurrency, roundToTwoDecimals } from '@/utils/sale-calculations'

interface SaleSummarySectionProps {
  subtotalNet: number
  totalIva: number
  totalItemDiscount: number
  globalDiscountAmount: number
  total: number
  totalPaymentDiscount?: number
  finalTotal?: number
}

export function SaleSummarySection({
  subtotalNet,
  totalIva,
  totalItemDiscount,
  globalDiscountAmount,
  total,
  totalPaymentDiscount = 0,
  finalTotal,
}: SaleSummarySectionProps) {
  const showPaymentDiscount = totalPaymentDiscount > 0
  const displayFinalTotal = finalTotal !== undefined ? finalTotal : total

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span>Subtotal (sin IVA)</span>
          <span>{formatCurrency(subtotalNet)}</span>
        </div>
        <div className="flex justify-between">
          <span>Impuestos (IVA)</span>
          <span>{formatCurrency(totalIva)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Descuentos (Items/Global)</span>
          <span>- {formatCurrency(roundToTwoDecimals(totalItemDiscount + globalDiscountAmount))}</span>
        </div>
        {showPaymentDiscount && (
          <div className="flex justify-between text-green-600">
            <span>Descuento por pago</span>
            <span>- {formatCurrency(totalPaymentDiscount)}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between text-base font-semibold border-t pt-2 mt-2">
        <div className="flex items-center gap-1">
          <span>Total</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center text-muted-foreground cursor-help">
                  <Info className="h-4 w-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Monto final a pagar incluyendo todos los descuentos e impuestos.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-lg">{formatCurrency(displayFinalTotal)}</span>
      </div>
    </div>
  )
}
