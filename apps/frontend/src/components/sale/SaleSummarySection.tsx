import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { formatCurrency, roundToTwoDecimals } from '@/utils/sale-calculations'

interface SaleSummarySectionProps {
  subtotalNet: number
  totalIva: number
  totalItemDiscount: number
  globalDiscountAmount: number
  total: number
}

export function SaleSummarySection({
  subtotalNet,
  totalIva,
  totalItemDiscount,
  globalDiscountAmount,
  total,
}: SaleSummarySectionProps) {
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
          <span>Descuentos</span>
          <span>- {formatCurrency(roundToTwoDecimals(totalItemDiscount + globalDiscountAmount))}</span>
        </div>
      </div>
      <div className="flex justify-between text-base font-semibold">
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
                <p>Precio unitario sin IVA. Descuentos antes del IVA. Cálculo con hasta 2 decimales.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

