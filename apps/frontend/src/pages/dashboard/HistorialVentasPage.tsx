import SalesHistoryChart from '@/components/dashboard/sucursales/sales-history-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Eye, Download } from "lucide-react"
import { useEntityContext } from "@/context/EntityContext";
import { type Branch } from '@/types/branch';
import { type SaleHeader } from '@/types/sale';
import ViewSaleDialog from '@/components/view-sale-dialog';
import { useState, useCallback } from 'react';
import useApi from '@/hooks/useApi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function SalesHistoryPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [sales, setSales] = useState<SaleHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleHeader | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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
        params: { branch_id: branchId }
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

  const getReceiptType = (sale: SaleHeader) => {
    if (sale.receipt_type) {
      return {
        displayName: (typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description) || 'N/A',
        filterKey: (typeof sale.receipt_type === 'object' && sale.receipt_type?.id?.toString()) || 'N/A',
        afipCode: (typeof sale.receipt_type === 'object' && sale.receipt_type?.afip_code) || 'N/A'
      };
    }
    return { displayName: 'N/A', filterKey: 'N/A', afipCode: 'N/A' };
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

  const handleViewDetail = (sale: SaleHeader) => {
    setSelectedSale(sale);
    setIsDetailOpen(true);
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
                    sales.map((sale) => {
                      const receiptTypeInfo = getReceiptType(sale);
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            {sale.receipt_number || sale.id}
                          </TableCell>
                          <TableCell>{getCustomerName(sale)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {receiptTypeInfo.displayName}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {formatDate(sale.date)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(sale.total)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer" 
                              onClick={() => handleViewDetail(sale)} 
                              title="Ver Detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasPermission('ver_comprobantes') && (
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
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
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
        />
      )}
    </div>
  );
}
