import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import useApi from "@/hooks/useApi";
import ViewSaleDialog from "@/components/view-sale-dialog";
import SaleReceiptPreviewDialog from "@/components/SaleReceiptPreviewDialog";
import { type SaleHeader } from "@/types/sale";
import { ArrowLeft, Download, Search, Filter, Eye, /*Receipt*/ } from "lucide-react";
import type { DateRange } from "@/components/ui/date-range-picker";
import { 
  receiptTypeColors, 
  getReceiptType, 
  getReceiptTypeBadgeClasses, 
  getReceiptTypeBadgeText,
  type ReceiptTypeInfo 
} from "@/lib/receiptTypeUtils";

export default function CustomerPurchasesPage() {
  const params = useParams()
  const { request } = useApi()
  const [customer, setCustomer] = useState<any>(null)
  const [purchases, setPurchases] = useState<SaleHeader[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [receiptTypeFilter, setReceiptTypeFilter] = useState("all")
  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() })
  const [selectedSale, setSelectedSale] = useState<SaleHeader | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalAmount: 0,
    averagePurchase: 0,
    totalIva: 0,
  })

  useEffect(() => {
    if (params.id) {
      fetchCustomer(params.id as string);
      fetchPurchases(params.id as string, dateRange); // Pass dateRange here
    }
  }, [params.id, dateRange]); // Add dateRange to dependency array

  const fetchCustomer = async (id: string) => {
    try {
      const response = await request({ method: "GET", url: `/customers/${id}` })
      if (response && response.success) {
        setCustomer(response.data)
      } else {
        toast.error("Error", {
          description: "No se pudo cargar la información del cliente",
        })
      }
    } catch (error) {
      console.error("Error fetching customer:", error)
      toast.error("Error", {
        description: "No se pudo cargar la información del cliente",
      })
    }
  }

  const fetchPurchases = async (customerId: string, currentDateRange?: DateRange) => { // Add currentDateRange parameter
    try {
      let url = `/customers/${customerId}/sales`;
      const queryParams = new URLSearchParams();
      if (currentDateRange?.from) {
        queryParams.append('from_date', format(currentDateRange.from, 'yyyy-MM-dd'));
      }
      if (currentDateRange?.to) {
        queryParams.append('to_date', format(currentDateRange.to, 'yyyy-MM-dd'));
      }
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      const apiResponse = await request({
        method: "GET",
        url: url, // Use the potentially modified URL
      });

      // Type for the API response, including sales data and summary statistics
      type CustomerSalesResponse = {
        success: boolean;
        message?: string;
        data: SaleHeader[]; // This is the array of sales
        sales_count?: number;
        grand_total_amount?: number;
        average_sale_amount?: number;
        grand_total_iva?: number;
      };

      const response = apiResponse as CustomerSalesResponse;

      if (response && response.success && response.data) {
        const salesData = response.data.map((p: SaleHeader) => ({
          ...p,
          affects_stock: typeof p.affects_stock === 'boolean' ? p.affects_stock : (typeof p.receipt_type === 'object' && p.receipt_type?.affects_stock_by_default === true),
          items: p.items || [],
          saleIvas: p.saleIvas || [],
        }));
        setPurchases(salesData);

        // Update stats directly from the response fields
        setStats({
          totalPurchases: response.sales_count ?? 0,
          totalAmount: response.grand_total_amount ?? 0,
          averagePurchase: response.average_sale_amount ?? 0,
          totalIva: response.grand_total_iva ?? 0,
        });
      } else {
        toast.error("Error al cargar compras", {
          description: response?.message || "No se pudo cargar el historial de compras del cliente.",
        });
        setPurchases([]);
        setStats({ totalPurchases: 0, totalAmount: 0, averagePurchase: 0, totalIva: 0 });
      }
    } catch (error: any) {
      console.error("Error fetching purchases:", error);
      const errorMessage = error?.response?.data?.message || error.message || "No se pudo cargar el historial de compras";
      toast.error("Error", {
        description: errorMessage,
      });
      setPurchases([]);
      setStats({ totalPurchases: 0, totalAmount: 0, averagePurchase: 0, totalIva: 0 });
    }
  };

  const formatDate = (dateString: string | null | undefined) => { // Allow null or undefined
    if (!dateString) return "Fecha inválida"; // Handle null or undefined
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
    } catch (error) {
      return "Fecha inválida";
    }
  };

  const formatCurrency = (amount: number | null | undefined) => { // Allow null or undefined
    if (amount === null || amount === undefined) return "$0.00"; // Handle null or undefined
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  };

  // Mapeo de tipos de comprobante a colores y nombres para la insignia
  // Using shared utility from receiptTypeUtils

  // Función para generar la insignia del tipo de comprobante
  const getReceiptTypeBadge = (receiptInfo: ReceiptTypeInfo) => {
    const cssClasses = getReceiptTypeBadgeClasses(receiptInfo);
    const textToShow = getReceiptTypeBadgeText(receiptInfo);
    return (
      <Badge className={cssClasses}>
        {textToShow}
      </Badge>
    );
  };

  const filteredPurchases = purchases.filter((purchase: SaleHeader) => {
    const matchesSearch =
      purchase.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof purchase.branch === 'object' ? purchase.branch?.description || "" : purchase.branch || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (getReceiptType(purchase).displayName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesReceiptType = receiptTypeFilter === "all" || 
      getReceiptType(purchase).filterKey === receiptTypeFilter;
    let matchesDate = true;
    if (dateRange && dateRange.from instanceof Date) {
      const purchaseDate = new Date(purchase.date);
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      if (dateRange.to instanceof Date) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = purchaseDate >= fromDate && purchaseDate <= toDate;
      } else {
        matchesDate = purchaseDate >= fromDate;
      }
    } else if (dateRange && dateRange.to instanceof Date) {
        const purchaseDate = new Date(purchase.date);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = purchaseDate <= toDate;
    }
    return matchesSearch && matchesReceiptType && matchesDate;
  })

  const handleExportCSV = () => {
    const headers = [
      "Número",
      "Comprobante",
      "Fecha",
      "Sucursal",
      "Subtotal",
      "IVA",
      "Descuento",
      "Total",
      "Afecta Stock",
    ]
    const csvData = filteredPurchases.map((purchase: SaleHeader) => [
      purchase.receipt_number,
      getReceiptType(purchase).displayName || "", // Changed from .name to .displayName
      formatDate(purchase.date),
      typeof purchase.branch === 'object' ? purchase.branch?.description || "" : purchase.branch || "",
      purchase.subtotal,
      purchase.total_iva_amount,
      purchase.discount_amount,
      purchase.total,
      purchase.affects_stock ? "Sí" : "No",
    ])
    const csvContent = [headers.join(","), ...csvData.map((row: any[]) => row.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `compras_cliente_${params.id}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getItemsCount = (purchase: SaleHeader) => {
    return purchase.items?.length || 0
  }

  const handleViewDetail = (sale: SaleHeader) => {
    setSelectedSale(sale)
    setIsDetailOpen(true)
  }

  /*
  const handleViewReceipt = (sale: SaleHeader) => {
    setSelectedSale(sale)
    setIsReceiptOpen(true)
  }
  */

  const handleDownloadPdf = async (sale: SaleHeader) => {
    if (!sale || !sale.id) {
            alert("No se puede descargar el PDF: ID de venta faltante.");
            return;
          }
          try {
            const response = await request({ 
              method: 'GET', 
              url: `/pos/sales/${sale.id}/pdf`,
              responseType: 'blob'
            });
            if (!response || !(response instanceof Blob)) {
              throw new Error("La respuesta del servidor no es un archivo PDF válido.");
            }
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const receiptTypeDesc = (typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description || 'comprobante').replace(/\s+/g, '_');
            const receiptNumber = sale.receipt_number || sale.id;
            const fileName = `${receiptTypeDesc}_${receiptNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } catch (error) {
            console.error("Error downloading PDF:", error);
            alert("Error al descargar PDF");
          }
  }


  return (
    <div className="flex-1 space-y-6 p-6 pt-8 md:p-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link to="/dashboard/clientes">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            Historial de Compras
            {customer && (
              <span className="ml-2 text-muted-foreground text-lg font-normal">
                {customer.person
                  ? `${customer.person.first_name} ${customer.person.last_name}`
                  : customer.business_name || "Cliente"}
              </span>
            )}
          </h2>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Comprobantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPurchases}</div>
            <p className="text-xs text-muted-foreground">Comprobantes emitidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">Valor total de compras</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IVA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalIva)}</div>
            <p className="text-xs text-muted-foreground">IVA total facturado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Compra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averagePurchase)}</div>
            <p className="text-xs text-muted-foreground">Valor promedio</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por número o sucursal..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
          <Select value={receiptTypeFilter} onValueChange={setReceiptTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Tipo de comprobante" />
            </SelectTrigger>
            <SelectContent style={{ maxHeight: 300, overflowY: 'auto' }}>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.keys(receiptTypeColors).filter(key => key !== 'default').map((key) => (
                <SelectItem key={key} value={key}>
                  {key} 
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePickerWithRange className="w-full md:w-auto" selected={dateRange} onSelect={range => setDateRange(range ?? { from: new Date(), to: new Date() })} />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="hidden md:table-cell">Sucursal</TableHead>
              <TableHead className="hidden md:table-cell">Items</TableHead>
              <TableHead className="hidden lg:table-cell">Subtotal</TableHead>
              <TableHead className="hidden lg:table-cell">IVA</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPurchases.length > 0 ? (
              filteredPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-medium">{purchase.receipt_number}</TableCell>
                  <TableCell>
                    {getReceiptTypeBadge(getReceiptType(purchase))}
                  </TableCell>
                  <TableCell>{formatDate(purchase.date)}</TableCell>
                  <TableCell className="hidden md:table-cell">{typeof purchase.branch === 'object' ? purchase.branch?.description || "N/A" : purchase.branch || "N/A"}</TableCell>
                  <TableCell className="hidden md:table-cell">{getItemsCount(purchase)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{formatCurrency(purchase.subtotal)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{formatCurrency(purchase.total_iva_amount)}</TableCell>
                  <TableCell>{formatCurrency(purchase.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200 cursor-pointer"
                        title="Ver detalle"
                        onClick={() => handleViewDetail(purchase)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver detalle</span>
                      </Button>
                    
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-amber-700 hover:bg-amber-100 hover:text-amber-800 border-amber-200 cursor-pointer"
                        title="Descargar PDF"
                        onClick={() => handleDownloadPdf(purchase)}
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Descargar PDF</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )))
            : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  {searchTerm || receiptTypeFilter !== "all" || dateRange?.from
                    ? "No se encontraron comprobantes con los filtros aplicados"
                    : "Este cliente no tiene comprobantes registrados"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {selectedSale && (
        <ViewSaleDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          sale={selectedSale}
          getCustomerName={() => // Changed: No longer uses 'sale' argument for name
            customer?.person 
              ? `${customer.person.first_name} ${customer.person.last_name}` 
              : customer?.business_name || "Cliente" // Changed: Uses page's customer state
          } 
          formatDate={formatDate} // Ensure this formatDate handles null/undefined
          getReceiptType={getReceiptType}
          onDownloadPdf={async (sale) => {
            if (!sale || !sale.id) {
              alert("No se puede descargar el PDF: ID de venta faltante.");
              return;
            }
            try {
              const response = await request({ 
                method: 'GET', 
                url: `/pos/sales/${sale.id}/pdf`,
                responseType: 'blob'
              });
              if (!response || !(response instanceof Blob)) {
                throw new Error("La respuesta del servidor no es un archivo PDF válido.");
              }
              const blob = new Blob([response], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              const receiptTypeDesc = (typeof sale.receipt_type === 'string' ? sale.receipt_type : sale.receipt_type?.description || 'comprobante').replace(/\s+/g, '_');
              const receiptNumber = sale.receipt_number || sale.id;
              const fileName = `${receiptTypeDesc}_${receiptNumber}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            } catch (error) {
              console.error("Error downloading PDF:", error);
              alert("Error al descargar PDF");
            }
          }}
        />
      )}
      
      {selectedSale && ( // Changed to use the new component
        <SaleReceiptPreviewDialog
          open={isReceiptOpen}
          onOpenChange={setIsReceiptOpen}
          sale={selectedSale}
          customerName={ // Added prop
            customer?.person 
              ? `${customer.person.first_name} ${customer.person.last_name}` 
              : customer?.business_name || "Cliente" // Derives from page's customer state
          }
          customerCuit={customer?.person?.cuit || customer?.cuit}
          formatDate={formatDate} // Pass the existing formatDate
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  )
}