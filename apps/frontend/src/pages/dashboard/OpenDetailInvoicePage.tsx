
import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { sileo } from "sileo"
import { Plus, Trash2, ArrowLeft, Check, ChevronsUpDown } from "lucide-react"
import useApi from "@/hooks/useApi"
import { useBranch } from "@/context/BranchContext"
import { useCustomerSearch } from "@/hooks/useCustomerSearch"
import { formatCurrency } from '@/utils/sale-calculations'
import { CustomerSearchSection } from "@/components/sale/CustomerSearchSection"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { PaymentMethod, ReceiptType } from '@/types/sale'
import type { CartItem } from '@/types/combo'
import { useSaleTotals } from '@/hooks/useSaleTotals'
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

// Interface for our manual items
interface ManualItem {
    id: string
    description: string // Custom description
    quantity: number
    unit_price: number
    product_id: number // Mapped to a real product ID for backend compatibility
    iva_rate?: number
}

// Adapt ManualItem to CartItem for useSaleTotals hooks if needed, or just calculate manually
// useSaleTotals expects CartItem. Let's make ManualItem compatible or mock it.
// Actually, I'll essentially treat them as CartItems.

export default function OpenDetailInvoicePage() {
    const navigate = useNavigate()
    const { request } = useApi()
    const { selectedBranch } = useBranch()

    // State
    const [items, setItems] = useState<ManualItem[]>([])
    const [products, setProducts] = useState<Array<{ id: number; description?: string; sale_price?: number; iva?: { rate?: number };[key: string]: unknown }>>([])
    const [openCombobox, setOpenCombobox] = useState(false)
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

    // Input states for new item
    const [newItemDescription, setNewItemDescription] = useState("")
    const [price, setPrice] = useState(0)
    const [qty, setQty] = useState(1)

    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([])
    const [receiptTypeId, setReceiptTypeId] = useState<number | undefined>(undefined)
    const [payments, setPayments] = useState<Array<{ payment_method_id: string; amount: string }>>([
        { payment_method_id: '', amount: '' }
    ])
    const [isProcessing, setIsProcessing] = useState(false)
    const [genericProduct, setGenericProduct] = useState<{ id: number;[key: string]: unknown } | null>(null)

    // Customer search hooks
    const {
        selectedCustomer,
        customerSearch,
        customerOptions,
        showCustomerOptions,
        setSelectedCustomer,
        setCustomerSearch,
        setShowCustomerOptions,
    } = useCustomerSearch()

    // Load resources
    useEffect(() => {
        fetchPaymentMethods()
        fetchReceiptTypes()
        fetchGenericProduct() // Ensure we have a fallback ID
        fetchProducts() // Fetch products for search
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only init
    }, [])

    const fetchPaymentMethods = async () => {
        try {
            const response = await request({ method: 'GET', url: '/pos/payment-methods' })
            const data = Array.isArray(response) ? response : response?.data || []
            setPaymentMethods(data)
        } catch (e) {
            console.error(e)
        }
    }

    const fetchReceiptTypes = async () => {
        try {
            const response = await request({ method: 'GET', url: '/receipt-types' })
            const data = Array.isArray(response) ? response : response?.data || []
            // Filter for invoices/sales types (Facturas)
            const validTypes = data.filter((t: { afip_code?: string }) => ['001', '006', '011', '017', '049'].includes(t.afip_code ?? ''))
            setReceiptTypes(validTypes)
            if (validTypes.length > 0) setReceiptTypeId(validTypes[0].id)
        } catch (e) {
            console.error(e)
        }
    }

    const fetchProducts = async () => {
        try {
            const response = await request({ method: 'GET', url: '/products?include=category,iva&per_page=1000' }) // Increased limit for search
            const productData = Array.isArray(response) ? response :
                Array.isArray(response?.data?.data) ? response.data.data :
                    Array.isArray(response?.data) ? response.data : [];
            setProducts(productData)
        } catch (err) {
            console.error("Error fetching products:", err)
        }
    }

    const fetchGenericProduct = async () => {
        try {
            // First try verify if we already have it
            if (genericProduct) return

            // Search for "GENERICO"
            const response = await request({ method: 'GET', url: '/products?search=GENERICO&per_page=1' })
            const data = response.data || []
            if (data.length > 0) {
                setGenericProduct(data[0])
            } else {
                // Fallback: Get the first product available as a placeholder
                const fallbackResponse = await request({ method: 'GET', url: '/products?per_page=1' })
                const fallbackData = fallbackResponse.data || []
                if (fallbackData.length > 0) {
                    setGenericProduct(fallbackData[0])
                }
            }
        } catch (err) {
            console.error("Error fetching generic product:", err)
        }
    }

    const addItem = () => {
        if (!newItemDescription || price <= 0 || qty <= 0) {
            sileo.error({ title: "Complete todos los campos del ítem correctamente" })
            return
        }

        // Use selected product ID if available, otherwise use generic product ID
        // If neither is available (shouldn't happen if generic fetch works), alerting user
        const finalProductId = selectedProductId || genericProduct?.id

        if (!finalProductId) {
            sileo.error({ title: "Error interno: No se pudo asignar un ID de producto genérico. Intente recargar." })
            return
        }

        // Find IVA rate: from selected product or generic
        let ivaRate = 21
        if (selectedProductId) {
            const p = products.find(p => p.id === selectedProductId)
            if (p?.iva?.rate) ivaRate = Number(p.iva.rate)
        } else if (genericProduct?.iva?.rate) {
            ivaRate = Number(genericProduct.iva.rate)
        }

        const newItem: ManualItem = {
            id: Date.now().toString(),
            description: newItemDescription,
            quantity: qty,
            unit_price: price,
            product_id: parseInt(finalProductId.toString()), // Ensure number
            iva_rate: ivaRate
        }

        setItems([...items, newItem])
        setNewItemDescription("")
        setPrice(0)
        setQty(1)
        setSelectedProductId(null) // Reset selection
        sileo.success({ title: "Ítem agregado" })
    }

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id))
    }

    // Calculations
    // We mock the cart items for useSaleTotals
    const cartForTotals = useMemo(() => {
        return items.map(i => ({
            id: i.id,
            product_id: i.product_id,
            quantity: i.quantity,
            price: i.unit_price, // Assuming net price input for now? Or gross? Let's assume Net.
            // Wait, 'price' in CartItem usually means Net Price in some contexts or Gross in others.
            // In PosPage: price: priceWithoutIva. 
            // So let's assume input is Net Price.
            sale_price: i.unit_price * (1 + (i.iva_rate || 0) / 100),
            iva_rate: i.iva_rate || 0,
            name: i.description,
            code: 'MANUAL',
            price_with_iva: i.unit_price * (1 + (i.iva_rate || 0) / 100),
            image: '',
            currency: 'ARS',
            is_from_combo: false
        }))
    }, [items])

    const { total } = useSaleTotals(cartForTotals as CartItem[], { type: '', value: '' })

    // Payment Logic (Simplified from CompleteSalePage)
    const handlePaymentAmountChange = (index: number, val: string) => {
        const newPayments = [...payments]
        newPayments[index].amount = val
        setPayments(newPayments)
    }

    const handlePaymentMethodChange = (index: number, val: string) => {
        const newPayments = [...payments]
        newPayments[index].payment_method_id = val
        setPayments(newPayments)
    }

    const addPaymentRow = () => {
        setPayments([...payments, { payment_method_id: '', amount: '' }])
    }

    const removePaymentRow = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index))
    }

    const pendingAmount = Math.max(0, total - payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0))

    const handleProcessSale = async () => {
        if (!selectedBranch) return
        if (items.length === 0) {
            sileo.error({ title: "Agrega items a la venta" })
            return
        }
        if (pendingAmount > 0.05) { // Tolerance
            sileo.error({ title: "El pago no cubre el total" })
            return
        }
        if (!receiptTypeId) {
            sileo.error({ title: "Selecciona un tipo de comprobante" })
            return
        }

        setIsProcessing(true)
        try {
            const saleData: {
                branch_id: number;
                customer_id: number | null;
                receipt_type_id: number;
                date: string;
                items: Array<{ product_id: number; quantity: number; unit_price: number }>;
                payments: Array<{ payment_method_id: number; amount: number }>;
                total: number;
            } = {
                branch_id: selectedBranch.id,
                customer_id: selectedCustomer?.id || null,
                receipt_type_id: receiptTypeId,
                date: new Date().toISOString(),
                items: items.map(i => ({
                    product_id: i.product_id,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    // Note: Description is NOT sent because backend doesn't support it in SaleItem yet.
                    // We rely on 'open detail' meaning Open Price + Generic Product.
                    // If backend supported 'description', we would send it.
                })),
                payments: payments.map(p => ({
                    payment_method_id: parseInt(p.payment_method_id),
                    amount: parseFloat(p.amount)
                })),
                total: total
            }

            const response = await request({ method: 'POST', url: '/pos/sales', data: saleData })

            if (response) {
                sileo.success({ title: "Venta creada exitosamente!" })
                // Clear
                setItems([])
                setPayments([{ payment_method_id: '', amount: '' }])
            }
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } }; message?: string };
            console.error(e)
            sileo.error({ title: "Error al procesar venta: " + (err.response?.data?.message || err.message || '') })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleProductSelect = (product: { id: number; description?: string; sale_price?: number; iva?: { rate?: number };[key: string]: unknown }) => {
        setSelectedProductId(product.id)
        setNewItemDescription(product.description ?? '')
        // Calculate net price from sale_price (which usually includes IVA in this system)
        const ivaRate = product.iva?.rate ? Number(product.iva.rate) : 0
        const priceWithIva = Number(product.sale_price || 0)
        const priceNet = ivaRate > 0 ? priceWithIva / (1 + ivaRate / 100) : priceWithIva

        setPrice(parseFloat(priceNet.toFixed(2)))
        setOpenCombobox(false)
        sileo.success({ title: "Producto seleccionado" })
    }

    return (
        <div className="container mx-auto p-4 max-w-5xl pb-32">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">Facturación Detalle Abierto (Beta)</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column: Items */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>Agregar Ítem</CardTitle>
                            <CardDescription>Busque un producto existente o ingrese manualmente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Product Search Combobox */}
                            <div className="flex flex-col space-y-2">
                                <Label>Buscar Producto (Opcional)</Label>
                                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCombobox}
                                            className="w-full justify-between"
                                        >
                                            {selectedProductId
                                                ? products.find((product) => product.id === selectedProductId)?.description
                                                : "Buscar producto..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Buscar producto..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontraron productos.</CommandEmpty>
                                                <CommandGroup>
                                                    {products.map((product) => (
                                                        <CommandItem
                                                            key={product.id}
                                                            value={`${product.description} ${product.code}`}
                                                            onSelect={() => handleProductSelect(product)}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedProductId === product.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span>{product.description}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    Code: {product.code} | {formatCurrency(product.sale_price)}
                                                                </span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="grid grid-cols-[1fr,100px,80px,auto] gap-2 items-end">
                                <div className="space-y-2">
                                    <Label>Descripción</Label>
                                    <Input
                                        value={newItemDescription}
                                        onChange={(e) => {
                                            setNewItemDescription(e.target.value)
                                            // Ensure we clear selected product if description changes manually?
                                            // No, keep it as 'based on this product' unless user clears it explicitly?
                                            // Actually, if user types new description, maybe they intend a NEW manual item.
                                            // But let's keep the ID for now to allow minor edits.
                                        }}
                                        placeholder="Descripción del ítem"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio Unit. (Neto)</Label>
                                    <Input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(parseFloat(e.target.value))}
                                        min={0}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cant.</Label>
                                    <Input
                                        type="number"
                                        value={qty}
                                        onChange={(e) => setQty(parseFloat(e.target.value))}
                                        min={1}
                                    />
                                </div>
                                <Button onClick={addItem} size="icon" className="mb-[2px]">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            {selectedProductId && (
                                <div className="text-xs text-muted-foreground">
                                    <span className="font-semibold text-primary">Producto Seleccionado:</span> Se utilizará el ID del producto real para el stock.
                                    <Button variant="link" size="sm" className="h-auto p-0 ml-2" onClick={() => {
                                        setSelectedProductId(null)
                                        setNewItemDescription("")
                                        setPrice(0)
                                        sileo.info({ title: "Selección limpiada" })
                                    }}>
                                        Limpiar
                                    </Button>
                                </div>
                            )}

                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Ítems</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead className="text-right">Cant.</TableHead>
                                        <TableHead className="text-right">P. Unit</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.description}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.unit_price * item.quantity)}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {items.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No hay ítems agregados.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Customer, Summary, Payment */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cliente y Comprobante</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <CustomerSearchSection
                                customerSearch={customerSearch}
                                customerOptions={customerOptions}
                                showCustomerOptions={showCustomerOptions}
                                selectedCustomer={selectedCustomer}
                                onSearchChange={setCustomerSearch}
                                onCustomerSelect={(c) => {
                                    setSelectedCustomer(c)
                                    setCustomerSearch(c.name)
                                    setShowCustomerOptions(false)
                                }}
                                onShowOptionsChange={setShowCustomerOptions}
                                onNewCustomerClick={() => {
                                    navigate('/dashboard/clientes/nuevo')
                                }}
                            />

                            <div>
                                <Label>Tipo Comprobante</Label>
                                <Select
                                    value={receiptTypeId ? receiptTypeId.toString() : ""}
                                    onValueChange={(v) => setReceiptTypeId(Number(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {receiptTypes.map((rt) => (
                                            <SelectItem key={rt.id} value={rt.id.toString()}>
                                                {rt.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Pagos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {payments.map((p, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Select value={p.payment_method_id} onValueChange={(v) => handlePaymentMethodChange(idx, v)}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="Método" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {paymentMethods.map(pm => (
                                                <SelectItem key={pm.id} value={pm.id.toString()}>{pm.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={p.amount}
                                        onChange={e => handlePaymentAmountChange(idx, e.target.value)}
                                        placeholder="Monto"
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => removePaymentRow(idx)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addPaymentRow} className="w-full">
                                <Plus className="mr-2 h-4 w-4" /> Agregar Pago
                            </Button>

                            <div className="pt-4 border-t space-y-2">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total:</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Pendiente:</span>
                                    <span className={pendingAmount > 0 ? "text-red-500" : "text-green-500"}>{formatCurrency(pendingAmount)}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardContent>
                            <Button className="w-full" disabled={isProcessing} onClick={handleProcessSale}>
                                {isProcessing ? "Procesando..." : "Finalizar Venta"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
