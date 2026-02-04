import SalesHistoryChart from '@/components/dashboard/sucursales/sales-history-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Eye, Download, Printer } from "lucide-react"
import { useEntityContext } from "@/context/EntityContext";
import { type Branch } from '@/types/branch';
import { type SaleHeader } from '@/types/sale';
import ViewSaleDialog from '@/components/view-sale-dialog';
import SaleReceiptPreviewDialog from '@/components/SaleReceiptPreviewDialog';
import { ArcaStatusBadge } from '@/components/sales/ArcaStatusBadge';
import { useState, useCallback } from 'react';
import useApi from '@/hooks/useApi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import Pagination from '@/components/ui/pagination';
import { useMemo } from 'react';

export default function SalesHistoryPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [sales, setSales] = useState<SaleHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleHeader | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Estado para el diálogo de impresión
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<SaleHeader | null>(null);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(15);
  const { state } = useEntityContext();
  const { request } = useApi();
  const { hasPermission } = useAuth();
  const branches = state.branches ? Object.values(state.branches) as Branch[] : [];

  const handleShowChart = () => {
    if (selectedBranchId) {
      setShowChart(true);
    }
  };

  const handleBranchChange = (value: string) => {
    const branchId = parseInt(value, 10);
    setSelectedBranchId(branchId);
    setShowChart(false); // Hide chart when branch changes
    setCurrentPage(1); // Reset to first page
    if (branchId) {
      loadSales(branchId);
    }
  };

  const loadSales = useCallback(async (branchId: number) => {
    setLoading(true);
    try {
      await request({
        method: 'GET',
        url: `/sales/history/branch/${branchId}`,
        params: { group_by: 'day' }
      });

      // Para obtener las ventas individuales, necesitamos hacer otra llamada
      const salesResponse = await request({
        method: 'GET',
        url: `/sales`,
        params: { branch_id: branchId, per_page: 1000 } // Obtener todas para paginación client-side
      });

      if (salesResponse && salesResponse.success) {
        setSales(salesResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
      toast.error('Error al cargar las ventas');
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  // Helper functions
  const getCustomerName = (sale: SaleHeader) => {
    if (typeof sale.customer === 'object' && sale.customer?.person) {
      return `${sale.customer.person.first_name} ${sale.customer.person.last_name}`.trim();
    }
    return (typeof sale.customer === 'object' && sale.customer?.person?.first_name) || 'Cliente no especificado';
  };

  const getReceiptType = (sale: SaleHeader): { displayName: string; filterKey: string; arcaCode: string } => {
    // Match logic used in VentasPage to avoid runtime errors
    if (sale.receipt_type && typeof sale.receipt_type === 'object') {
      const upperDescription = (sale.receipt_type.description || "").toUpperCase();
      const arcaCode = String(sale.receipt_type.afip_code || "N/A");
      return {
        displayName: upperDescription,
        filterKey: upperDescription,
        arcaCode: arcaCode,
      };
    }
    const actualReceiptType = (sale as any).receipt_type as any;
    const actualArcaCode = (sale as any).receipt_type_code as any;

    if (typeof actualReceiptType === 'string' && actualReceiptType.trim() !== '') {
      const upperDescription = actualReceiptType.toUpperCase();
      const arcaCode = (typeof actualArcaCode === 'string' && actualArcaCode.trim() !== '') ? actualArcaCode : "N/A";
      return {
        displayName: upperDescription,
        filterKey: upperDescription,
        arcaCode: String(arcaCode),
      };
    }
    return { displayName: "N/A", filterKey: "N/A", arcaCode: "N/A" };
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return '$0.00';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const handleViewDetail = async (sale: SaleHeader) => {
    try {
      const response = await request({ method: 'GET', url: `/sales/${sale.id}` });
      const fullSale = (response as any)?.data?.data ?? (response as any)?.data ?? response;
      setSelectedSale(fullSale);
      setIsDetailOpen(true);
    } catch (error) {
      console.error('Error al cargar el detalle de la venta:', error);
      toast.error('No se pudo cargar el detalle de la venta');
      setSelectedSale(sale);
      setIsDetailOpen(true);
    }
  };

  const handleDownloadPdf = async (sale: SaleHeader) => {
    if (!sale || !sale.id) {
      toast.error('No se puede descargar el PDF: ID de venta faltante.');
      return;
    }
    try {
      const response = await request({
        method: 'GET',
        url: `/sales/${sale.id}/pdf`,
        responseType: 'blob'
      });

      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprobante_${sale.receipt_number || sale.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF descargado exitosamente');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Error al descargar el PDF');
    }
  };

  const handlePrintReceipt = async (sale: SaleHeader) => {
    try {
      const response = await request({ method: 'GET', url: `/sales/${sale.id}` })
      const fullSale = (response as any)?.data?.data || (response as any)?.data || response
      setSelectedReceiptSale(fullSale)
      setShowReceiptPreview(true)
    } catch (error) {
      console.error('Error fetching sale details for receipt:', error)
      toast.error('No se pudo cargar el detalle del comprobante')
      setSelectedReceiptSale(sale)
      setShowReceiptPreview(true)
    }
  };

  /**
   * Maneja la actualización de una venta después de autorización AFIP
   */
  const handleSaleUpdated = async (updatedSale: SaleHeader) => {
    // Actualizar en la lista local
    setSales(prevSales =>
      prevSales.map(sale =>
        sale.id === updatedSale.id ? updatedSale : sale
      )
    );

    // Actualizar la venta seleccionada
    if (selectedSale && selectedSale.id === updatedSale.id) {
      setSelectedSale(updatedSale);
    }

    // Recargar ventas si hay una sucursal seleccionada
    if (selectedBranchId) {
      loadSales(selectedBranchId);
    }
  };

  // Paginación client-side
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return sales.slice(startIndex, endIndex);
  }, [sales, currentPage, perPage]);

  const totalPages = Math.ceil(sales.length / perPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Historial de Ventas por Sucursal</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Seleccionar Sucursal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
          <Select onValueChange={handleBranchChange} value={selectedBranchId?.toString() || ''}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Seleccione una sucursal" />
            </SelectTrigger>
            <SelectContent>
              {branches.length > 0 ? (
                branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.description}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-branches" disabled>No hay sucursales cargadas</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button onClick={handleShowChart} disabled={!selectedBranchId} className="w-full sm:w-auto">
            Mostrar Gráfico
          </Button>
        </CardContent>
      </Card>

      {showChart && selectedBranchId && (
        <Card>
          <CardHeader>
            <CardTitle>Gráfico de Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesHistoryChart branchId={selectedBranchId} className="mt-4" />
          </CardContent>
        </Card>
      )}

      {selectedBranchId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Ventas de la Sucursal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Comprobante</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Cargando ventas...
                      </TableCell>
                    </TableRow>
                  ) : sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No hay ventas para mostrar
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSales.map((sale) => {
                      const receiptTypeInfo = getReceiptType(sale);
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            {sale.receipt_number || sale.id}
                          </TableCell>
                          <TableCell>{getCustomerName(sale)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {receiptTypeInfo.displayName}
                              </Badge>
                              <ArcaStatusBadge sale={sale} showConfigWarning />
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {formatDate(sale.date)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(sale.total)}
                          </TableCell>
                          <TableCell className="text-center">
                            {hasPermission('ver_ventas') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                                onClick={() => handleViewDetail(sale)}
                                title="Ver Detalle"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {hasPermission('reimprimir_comprobantes') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 cursor-pointer"
                                onClick={() => handleDownloadPdf(sale)}
                                title="Descargar PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {hasPermission('reimprimir_comprobantes') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 cursor-pointer"
                                onClick={() => handlePrintReceipt(sale)}
                                title="Imprimir Ticket"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Paginación */}
            {!loading && sales.length > 0 && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                lastPage={totalPages}
                total={sales.length}
                itemName="ventas"
                onPageChange={handlePageChange}
                disabled={loading}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ViewSaleDialog */}
      {selectedSale && (
        <ViewSaleDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          sale={selectedSale}
          getCustomerName={getCustomerName}
          formatDate={formatDate}
          getReceiptType={getReceiptType}
          onDownloadPdf={handleDownloadPdf}
          onPrintPdf={async (sale) => handlePrintReceipt(sale)}
          onSaleUpdated={handleSaleUpdated}
        />
      )}

      {/* Diálogo de impresión */}
      <SaleReceiptPreviewDialog
        open={showReceiptPreview}
        onOpenChange={setShowReceiptPreview}
        sale={selectedReceiptSale}
        customerName={selectedReceiptSale ? getCustomerName(selectedReceiptSale) : ''}
        customerCuit={selectedReceiptSale?.customer?.person?.cuit}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
