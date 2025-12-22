import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, roundToTwoDecimals } from "@/utils/sale-calculations"
import type { CartItem } from "@/types/combo"

interface SaleItemsTableProps {
    cart: CartItem[]
    onUpdateItem: (index: number, changes: Partial<CartItem>) => void
    hasPermission: (permission: string) => boolean
}

export function SaleItemsTable({ cart, onUpdateItem, hasPermission }: SaleItemsTableProps) {
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Cant.</TableHead>
                        <TableHead className="text-right">P. Unit (sin IVA)</TableHead>
                        <TableHead className="text-right">Subt. (sin IVA)</TableHead>
                        <TableHead className="text-right">Desc. (importe)</TableHead>
                        <TableHead className="text-right">IVA</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Desc. Tipo</TableHead>
                        <TableHead className="text-right">Desc. Valor</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {cart.map((item, idx) => {
                        const base = roundToTwoDecimals((item.price || 0) * item.quantity)
                        const itemDiscRaw = item.discount_type === 'percent'
                            ? roundToTwoDecimals(base * ((item.discount_value || 0) / 100))
                            : roundToTwoDecimals(Number(item.discount_value || 0))
                        const safeDisc = Math.max(0, Math.min(itemDiscRaw, base))
                        const net = roundToTwoDecimals(base - safeDisc)
                        const iva = roundToTwoDecimals(net * ((item.iva_rate || 0) / 100))
                        const tot = roundToTwoDecimals(net + iva)

                        return (
                            <TableRow key={item.id}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(base)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(safeDisc)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(iva)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(tot)}</TableCell>
                                <TableCell className="text-right">
                                    <Select
                                        value={item.discount_type || ''}
                                        onValueChange={(v) => {
                                            onUpdateItem(idx, {
                                                discount_type: v as 'percent' | 'amount'
                                            })
                                        }}
                                        disabled={!hasPermission('aplicar_descuentos')}
                                    >
                                        <SelectTrigger className="w-[130px]">
                                            <SelectValue placeholder="Tipo" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px] overflow-y-auto">
                                            <SelectItem value="percent">% Porcentaje</SelectItem>
                                            <SelectItem value="amount">$ Monto</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Input
                                        className="w-[120px] ml-auto"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        placeholder={item.discount_type === 'percent' ? '0.00' : '0.00'}
                                        value={item.discount_value?.toString() || ''}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            onUpdateItem(idx, {
                                                discount_value: val === '' ? undefined : Number(val)
                                            })
                                        }}
                                        disabled={!hasPermission('aplicar_descuentos')}
                                    />
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
