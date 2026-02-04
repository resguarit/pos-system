/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Eye, Calendar, X } from 'lucide-react'
import useApi from '@/hooks/useApi'
import { toast } from 'sonner'
import { format, startOfMonth } from 'date-fns'
import ViewSaleDialog from "@/components/view-sale-dialog"
import SaleReceiptPreviewDialog from "@/components/SaleReceiptPreviewDialog"
import Pagination from '@/components/ui/pagination'

interface Transaction {
  id: number
  type: 'entry' | 'exit'
  description: string
  amount: number
  created_at: string
  user: {
    id: number | null
    name: string
  }
  sale?: {
    id: number
    receipt_number?: string | null
  } | null
  payment_method?: {
    id: number
    name: string
  } | null
}

interface TransactionHistoryProps {
  currentBranchId?: number
}

export default function TransactionHistory({ currentBranchId = 1 }: TransactionHistoryProps) {
  const { request } = useApi()
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'entry' | 'exit'>('all')
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 5

  // New: keep a full dataset for client-side pagination
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])

  // New: state for viewing sale details
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [saleDialogOpen, setSaleDialogOpen] = useState(false)

  // State for receipt preview
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<any>(null)

  const handlePrintReceipt = async (sale: any) => {
    try {
      // Fetch full sale details to ensure items are present
      const response = await request({ method: 'GET', url: `/sales/${sale.id}` })
      const fullSale = (response as any)?.data?.data || (response as any)?.data || response
      setSelectedReceiptSale(fullSale)
      setShowReceiptPreview(true)
    } catch (error) {
      console.error('Error fetching sale details for receipt:', error)
      toast.error('No se pudo cargar el detalle del comprobante')
      // Fallback to passed sale if fetch fails, though it might be incomplete
      setSelectedReceiptSale(sale)
      setShowReceiptPreview(true)
    }
  }

  const loadTransactions = async () => {
    setIsLoading(true)
    try {
      // Fetch ALL pages from API and paginate on client side
      const perPage = 100 // API cap
      let page = 1
      let total = 0
      let combined: Transaction[] = []

      // Construir params - solo incluir fechas si tienen valor
      const buildParams = (pageNum: number) => {
        const params: Record<string, any> = {
          page: pageNum,
          per_page: perPage,
        }
        if (dateFrom) params.from_date = dateFrom
        if (dateTo) params.to_date = dateTo
        return params
      }

      // First request to get total
      const firstResp = await request({
        method: 'GET',
        url: `/sales/history/branch/${currentBranchId}`,
        params: buildParams(page),
      })

      const firstPayload = (firstResp && (firstResp as any).data) ? (firstResp as any).data : firstResp
      const firstItems = Array.isArray(firstPayload?.data)
        ? firstPayload.data
        : Array.isArray(firstPayload)
          ? firstPayload
          : []
      total = (firstPayload && typeof firstPayload.total === 'number') ? firstPayload.total : firstItems.length
      combined = firstItems as Transaction[]

      const pages = Math.max(1, Math.ceil(total / perPage))
      // Fetch remaining pages if any
      while (page < pages) {
        page += 1
        const resp = await request({
          method: 'GET',
          url: `/sales/history/branch/${currentBranchId}`,
          params: buildParams(page),
        })
        const payload = (resp && (resp as any).data) ? (resp as any).data : resp
        const items = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : []
        combined = combined.concat(items as Transaction[])
      }

      setAllTransactions(combined)
    } catch (error: any) {
      console.error('Error loading transactions:', error)
      toast.error(error.response?.data?.message || 'Error al cargar el historial de transacciones')
      setAllTransactions([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Reset to first page on filter/date changes
    setCurrentPage(1)
    loadTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, dateFrom, dateTo, currentBranchId])

  useEffect(() => {
    // Apply search and type filters client-side over full dataset
    let filtered = allTransactions

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(transaction =>
        (transaction.description || '').toLowerCase().includes(term) ||
        ((transaction.user?.name || '').toLowerCase().includes(term)) ||
        ((transaction.sale?.receipt_number || '').toLowerCase().includes(term))
      )
    }

    setFilteredTransactions(filtered)
    setTotalPages(Math.max(1, Math.ceil(filtered.length / itemsPerPage)))
    // If current page exceeds new total pages after filtering, bring it back
    setCurrentPage(prev => Math.min(Math.max(1, Math.ceil(filtered.length / itemsPerPage)), prev))
  }, [allTransactions, searchTerm, filterType])

  // Slice current page for rendering
  const pageStart = (currentPage - 1) * itemsPerPage
  const pageEnd = pageStart + itemsPerPage
  const currentPageItems = filteredTransactions.slice(pageStart, pageEnd)

  const getTypeColor = (type: 'entry' | 'exit') => {
    return type === 'entry' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const formatAmount = (amount: number, type: 'entry' | 'exit') => {
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount)

    return type === 'entry' ? `+${formattedAmount}` : `-${formattedAmount}`
  }

  // Helpers used by ViewSaleDialog
  const getCustomerName = (sale: any) => {
    return sale.customer_name ||
      (sale.customer?.person
        ? `${sale.customer.person.first_name} ${sale.customer.person.last_name}`.trim()
        : 'Consumidor Final')
  }

  const formatDateForDialog = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }

  const getReceiptType = (sale: any) => {
    return {
      displayName: sale.receiptType?.name || sale.receipt_type?.name || 'Venta',
      arcaCode: sale.receiptType?.afip_code || sale.receipt_type?.afip_code || '0'
    }
  }


  const handleViewSale = async (saleId?: number) => {
    if (!saleId) return
    try {
      const response = await request({ method: 'GET', url: `/sales/${saleId}` })
      const fullSale = (response as any)?.data?.data || (response as any)?.data || response
      setSelectedSale(fullSale)
      setSaleDialogOpen(true)
    } catch (error) {
      console.error('Error al cargar los detalles de la venta:', error)
      toast.error('No se pudo cargar el detalle de la venta')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Historial de Transacciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transacciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'entry' | 'exit')}
              >
                <option value="all">Todos los tipos</option>
                <option value="entry">Solo entradas</option>
                <option value="exit">Solo salidas</option>
              </select>
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                title="Limpiar fechas"
                className="h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabla de transacciones */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="w-12">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : currentPageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    No hay transacciones
                  </TableCell>
                </TableRow>
              ) : (
                currentPageItems.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(t.type)}>
                        {t.type === 'entry' ? 'Entrada' : 'Salida'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate" title={t.description}>
                      {t.description}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(t.amount, t.type)}
                    </TableCell>
                    <TableCell>{t.user?.name || '-'}</TableCell>
                    <TableCell>{t.sale?.receipt_number || '-'}</TableCell>
                    <TableCell>{t.payment_method?.name || '-'}</TableCell>
                    <TableCell>
                      {t.sale?.id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200 cursor-pointer"
                          title="Ver detalle de venta"
                          onClick={() => handleViewSale(t.sale?.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <Pagination
          currentPage={currentPage}
          lastPage={totalPages}
          total={filteredTransactions.length}
          itemName="transacciones"
          onPageChange={setCurrentPage}
          disabled={false}
          className="mt-4"
        />

        {/* Resumen */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                }).format(
                  filteredTransactions
                    .filter(t => t.type === 'entry')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">Total Entradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                }).format(
                  filteredTransactions
                    .filter(t => t.type === 'exit')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">Total Salidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                }).format(
                  filteredTransactions.reduce((sum, t) =>
                    t.type === 'entry' ? sum + t.amount : sum - t.amount, 0
                  )
                )}
              </div>
              <p className="text-xs text-muted-foreground">Balance Neto</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>

      {/* Dialogo de detalle de venta */}
      {selectedSale && (
        <ViewSaleDialog
          sale={selectedSale}
          open={saleDialogOpen}
          onOpenChange={setSaleDialogOpen}
          getCustomerName={getCustomerName}
          formatDate={formatDateForDialog}
          getReceiptType={getReceiptType}
          onDownloadPdf={async () => {
          }}
          onSaleUpdated={(updatedSale) => {
            if (selectedSale && selectedSale.id === updatedSale.id) {
              setSelectedSale(updatedSale);
            }
          }}
          onPrintPdf={async (sale) => handlePrintReceipt(sale)}
        />
      )}

      {/* Dialogo de impresión de comprobante */}
      <SaleReceiptPreviewDialog
        open={showReceiptPreview}
        onOpenChange={setShowReceiptPreview}
        sale={selectedReceiptSale}
        customerName={selectedReceiptSale ? getCustomerName(selectedReceiptSale) : ''}
        customerCuit={selectedReceiptSale?.customer?.person?.cuit || selectedReceiptSale?.customer?.cuit}
        formatDate={formatDateForDialog}
        formatCurrency={(val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(val))}
      />
    </Card>
  )
}
