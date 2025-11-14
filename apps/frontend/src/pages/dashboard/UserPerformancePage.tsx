import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useApi from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResizableTableHeader, ResizableTableCell } from '@/components/ui/resizable-table-header';
import { toast } from 'sonner';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Download, TrendingUp, BarChart3, DollarSign, Users, Target, Award, RefreshCw } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from '@/components/ui/date-range-picker';
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useResizableColumns } from '@/hooks/useResizableColumns';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  branches: string[];
}

interface Sale {
  id: number;
  receipt_number: string;
  receipt_type: string;
  customer: string;
  branch: string;
  items_count: number;
  subtotal: number;
  total_iva_amount: number;
  total: number;
  date: string;
  status: string;
}

interface SalesStatistics {
  total_sales: number;
  total_amount: number;
  total_iva_amount: number;
  average_sale_amount: number;
  budget_count: number;
  by_receipt_type: Array<{
    receipt_type: string;
    count: number;
    total_amount: number;
  }>;
  by_branch: Array<{
    branch: string;
    count: number;
    total_amount: number;
  }>;
  last_7_days: {
    sales_count: number;
    total_amount: number;
  };
  last_30_days: {
    sales_count: number;
    total_amount: number;
  };
}

interface DailySales {
  date: string;
  sales_count: number;
  total_amount: number;
}

interface MonthlySales {
  year: number;
  month: number;
  month_key: string;
  sales_count: number;
  total_amount: number;
}

interface TopProduct {
  product_id: number;
  product_name: string;
  product_code: string;
  sales_count: number;
  total_quantity: number;
  total_amount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function UserPerformancePage() {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { request, loading } = useApi();
  const { hasPermission, user: currentUser } = useAuth();


  // Estados principales
  const [user, setUser] = useState<User | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesPagination, setSalesPagination] = useState<{
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  } | null>(null);
  const [statistics, setStatistics] = useState<SalesStatistics | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  // Estados de filtros
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [branches, setBranches] = useState<Array<{ id: number; description: string }>>([]);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(5); // Porcentaje de comisión por defecto


  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(20);

  // Configuración de columnas redimensionables
  const columnConfig = [
    { id: 'receipt_number', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'receipt_type', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'customer', minWidth: 150, maxWidth: 300, defaultWidth: 200 },
    { id: 'branch', minWidth: 120, maxWidth: 200, defaultWidth: 150 },
    { id: 'items_count', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
    { id: 'subtotal', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'total_iva_amount', minWidth: 100, maxWidth: 150, defaultWidth: 120 },
    { id: 'total', minWidth: 120, maxWidth: 180, defaultWidth: 150 },
    { id: 'date', minWidth: 120, maxWidth: 180, defaultWidth: 150 },
    { id: 'status', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
  ];

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    getColumnCellProps,
  } = useResizableColumns({
    columns: columnConfig,
    storageKey: 'user-performance-column-widths',
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchBranches();
    } else {
      toast.error('ID de usuario no válido');
    }
  }, [userId]);

  // Cargar datos cuando cambien los filtros
  useEffect(() => {
    if (userId) {
      fetchSalesData();
      fetchStatistics();
      fetchDailySales();
      fetchMonthlySales();
      fetchTopProducts();
    }
  }, [userId, currentPage, dateRange, branchFilter]);

  const fetchUserData = async () => {
    try {
      setLoadingUser(true);
      
      const response = await request({
        method: 'GET',
        url: `/users/${userId}`,
      });
      
      if (response?.data) {
        setUser(response.data);
      } else if (response) {
        // Si la respuesta viene directamente sin .data
        setUser(response);
      } else {
        toast.error('No se pudieron cargar los datos del usuario');
      }
    } catch (error) {
      toast.error('Error al cargar los datos del usuario');
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await request({
        method: 'GET',
        url: '/branches',
      });
      if (response?.data) {
        setBranches(response.data);
      }
    } catch (error) {
      // Silently fail - branches are optional
    }
  };

  const fetchSalesData = async () => {
    // Solo cargar datos de ventas si el usuario tiene el permiso
    if (!hasPermission('ver_ventas_usuario')) {
      return;
    }

    try {
      setLoadingData(true);
      const params: any = {
        page: currentPage,
        per_page: 10,
      };

      if (dateRange?.from && dateRange?.to) {
        params.from_date = format(dateRange.from, 'yyyy-MM-dd');
        params.to_date = format(dateRange.to, 'yyyy-MM-dd');
      }

      if (branchFilter !== 'all') {
        params.branch_id = branchFilter;
      }

      const response = await request({
        method: 'GET',
        url: `/users/${userId}/sales`,
        params,
      });

      if (response?.data) {
        setSales(response.data);
        if (response.pagination) {
          setSalesPagination({
            current_page: response.pagination.current_page || 1,
            last_page: response.pagination.last_page || 1,
            per_page: response.pagination.per_page || 10,
            total: response.pagination.total || 0,
            from: response.pagination.from || 0,
            to: response.pagination.to || 0,
          });
          setTotalPages(response.pagination.last_page || 1);
        }
      }
    } catch (error) {
      toast.error('Error al cargar las ventas');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params: any = {};

      if (dateRange?.from && dateRange?.to) {
        params.from_date = format(dateRange.from, 'yyyy-MM-dd');
        params.to_date = format(dateRange.to, 'yyyy-MM-dd');
      }

      if (branchFilter !== 'all') {
        params.branch_id = branchFilter;
      }

      const response = await request({
        method: 'GET',
        url: `/users/${userId}/sales/statistics`,
        params,
      });

      if (response?.data) {
        // Mapear la respuesta del API a la estructura esperada
        const apiData = response.data;
        
        const mappedStatistics = {
          total_sales: apiData.summary?.total_sales || 0,
          total_amount: apiData.summary?.total_amount || 0,
          total_iva_amount: apiData.summary?.total_iva || 0,
          average_sale_amount: apiData.summary?.average_sale_amount || 0,
          budget_count: apiData.summary?.budget_count || 0,
          last_7_days: {
            sales_count: apiData.period_stats?.last_7_days?.count || 0,
            total_amount: apiData.period_stats?.last_7_days?.total_amount || 0
          },
          last_30_days: {
            sales_count: apiData.period_stats?.last_30_days?.count || 0,
            total_amount: apiData.period_stats?.last_30_days?.total_amount || 0
          },
          by_branch: apiData.by_branch || [],
          by_receipt_type: apiData.by_receipt_type || []
        };
        
        setStatistics(mappedStatistics);
      }
    } catch (error) {
      toast.error('Error al cargar las estadísticas');
    }
  };

  const fetchDailySales = async () => {
    try {
      const params: any = {};

      if (dateRange?.from && dateRange?.to) {
        params.from_date = format(dateRange.from, 'yyyy-MM-dd');
        params.to_date = format(dateRange.to, 'yyyy-MM-dd');
      }

      if (branchFilter !== 'all') {
        params.branch_id = branchFilter;
      }

      const response = await request({
        method: 'GET',
        url: `/users/${userId}/sales/daily`,
        params,
      });

      if (Array.isArray(response)) {
        setDailySales(response);
      } else if (response?.data) {
        setDailySales(response.data);
      } else {
        setDailySales([]);
      }
    } catch (error) {
      setDailySales([]);
    }
  };

  /**
   * Obtiene las ventas mensuales del usuario
   * Principio: Single Responsibility - Solo obtiene ventas mensuales
   */
  const fetchMonthlySales = async () => {
    try {
      const params: any = {};

      if (dateRange?.from && dateRange?.to) {
        params.from_date = format(dateRange.from, 'yyyy-MM-dd');
        params.to_date = format(dateRange.to, 'yyyy-MM-dd');
      }

      if (branchFilter !== 'all') {
        params.branch_id = branchFilter;
      }

      const response = await request({
        method: 'GET',
        url: `/users/${userId}/sales/monthly`,
        params,
      });

      if (Array.isArray(response)) {
        setMonthlySales(response);
      } else if (response?.data) {
        setMonthlySales(response.data);
      } else {
        setMonthlySales([]);
      }
    } catch (error) {
      setMonthlySales([]);
    }
  };

  /**
   * Obtiene los productos más vendidos del usuario
   * Principio: Single Responsibility - Solo obtiene productos más vendidos
   */
  const fetchTopProducts = async () => {
    try {
      const params: any = {};

      if (dateRange?.from && dateRange?.to) {
        params.from_date = format(dateRange.from, 'yyyy-MM-dd');
        params.to_date = format(dateRange.to, 'yyyy-MM-dd');
      }

      if (branchFilter !== 'all') {
        params.branch_id = branchFilter;
      }

      const response = await request({
        method: 'GET',
        url: `/users/${userId}/sales/top-products`,
        params,
      });

      if (Array.isArray(response)) {
        setTopProducts(response);
      } else if (response?.data) {
        setTopProducts(response.data);
      } else {
        setTopProducts([]);
      }
    } catch (error) {
      setTopProducts([]);
    }
  };

  const handleExportCSV = async () => {
    try {
      if (!hasPermission('exportar_reportes')) {
        toast.error('No tienes permisos para exportar reportes');
        return;
      }

      toast.loading('Generando exportación...', { id: 'export-toast' });

      const params: any = {
        per_page: 1000,
        page: 1,
      };

      if (dateRange?.from && dateRange?.to) {
        params.from_date = format(dateRange.from, 'yyyy-MM-dd');
        params.to_date = format(dateRange.to, 'yyyy-MM-dd');
      }

      if (branchFilter !== 'all') {
        params.branch_id = branchFilter;
      }

      const response = await request({
        method: 'GET',
        url: `/users/${userId}/sales`,
        params,
      });

      if (response?.data) {
        const allSales = response.data;

        const headers = [
          'Número',
          'Comprobante',
          'Cliente',
          'Sucursal',
          'Items',
          'Subtotal',
          'IVA',
          'Total',
          'Fecha',
          'Estado',
        ];

        const data = allSales.map((sale: Sale) => ({
          Número: sale.receipt_number || sale.id,
          Comprobante: sale.receipt_type,
          Cliente: sale.customer,
          Sucursal: sale.branch,
          Items: sale.items_count,
          Subtotal: sale.subtotal,
          IVA: sale.total_iva_amount,
          Total: sale.total,
          Fecha: format(new Date(sale.date), 'dd/MM/yyyy'),
          Estado: sale.status === 'annulled' ? 'Anulada' : 'Activa',
        }));

        const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'VentasUsuario');

        // Obtener el nombre del usuario desde el estado o desde la respuesta del API
        const userNameRaw = user?.name || (response as any)?.user?.name || userId?.toString() || 'usuario';
        const userName = typeof userNameRaw === 'string' ? userNameRaw.replace(/\s+/g, '_') : 'usuario';
        const fileName = `desempeno_${userName}_${format(dateRange?.from || new Date(), 'yyyy-MM-dd')}_${format(dateRange?.to || new Date(), 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        toast.success(`Exportación completada: ${allSales.length} ventas exportadas.`, { id: 'export-toast' });
      } else {
        toast.error('No se pudieron obtener las ventas para exportar.', { id: 'export-toast' });
      }
    } catch (error) {
      toast.error('Error al generar la exportación.', { id: 'export-toast' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const formatShortDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage && !loadingData) {
      setCurrentPage(pageNumber);
    }
  };

  const calculateCommission = (totalAmount: number, commissionRate: number = 0.05) => {
    return totalAmount * commissionRate;
  };

  if (loadingUser || !user) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Cargando datos del usuario...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/usuarios')} className="cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Desempeño de {user.name}</h1>
            <p className="text-muted-foreground">{user.email} • {user.role}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => {
            fetchSalesData();
            fetchStatistics();
            fetchDailySales();
          }} disabled={loadingData} title="Refrescar" className="cursor-pointer">
            <RefreshCw className={loadingData ? "animate-spin h-4 w-4" : "h-4 w-4"} />
          </Button>
          {hasPermission('exportar_reportes') && (
            <Button onClick={handleExportCSV} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-2 items-end">
            <div className="space-y-2 flex-1">
              <Label>Rango de fechas</Label>
              <DatePickerWithRange
                selected={dateRange}
                onSelect={setDateRange}
              />
            </div>
            <div className="space-y-2 flex-1">
              <Label>Sucursal</Label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateRange({
                    from: startOfMonth(new Date()),
                    to: new Date(),
                  });
                  setBranchFilter('all');
                }}
                className="cursor-pointer"
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas principales */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.total_sales || 0}</div>
              <p className="text-xs text-muted-foreground">
                {statistics?.last_7_days?.sales_count || 0} en los últimos 7 días
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics?.total_amount || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(statistics?.last_7_days?.total_amount || 0)} en los últimos 7 días
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics?.average_sale_amount || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Promedio de {statistics?.total_sales || 0} ventas
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comisión Estimada</CardTitle>
              <Award className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(calculateCommission(statistics?.total_amount || 0, commissionPercentage / 100))}</div>
              <p className="text-xs text-muted-foreground">
                Al {commissionPercentage}% de comisión
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs con gráficos y tabla */}
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          {hasPermission('ver_ventas_usuario') && (
            <TabsTrigger value="history">Historial</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico de ventas diarias */}
            <Card>
              <CardHeader>
                <CardTitle>Ventas Diarias</CardTitle>
                <CardDescription>Evolución de ventas por día</CardDescription>
              </CardHeader>
                <CardContent>
                  {dailySales && dailySales.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dailySales}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                        />
                        <YAxis 
                          tickFormatter={(value) => {
                            if (value >= 1000000) {
                              return `$${(value / 1000000).toFixed(1)}M`;
                            } else if (value >= 1000) {
                              return `$${(value / 1000).toFixed(1)}K`;
                            } else {
                              return `$${value}`;
                            }
                          }}
                          tick={{ fontSize: 12 }}
                          width={100}
                        />
                        <Tooltip 
                          formatter={(value: any, name: string) => [
                            name === 'total_amount' ? formatCurrency(value) : value.toLocaleString("es-AR"),
                            name === 'total_amount' ? 'Monto' : 'Ventas'
                          ]}
                          labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy')}
                        />
                        <Line type="monotone" dataKey="sales_count" stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="total_amount" stroke="#82ca9d" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay datos de ventas diarias</p>
                      </div>
                    </div>
                  )}
                </CardContent>
            </Card>

            {/* Gráfico de productos más vendidos */}
            <Card>
              <CardHeader>
                <CardTitle>Productos Más Vendidos</CardTitle>
                <CardDescription>Top 10 productos vendidos por el usuario</CardDescription>
              </CardHeader>
              <CardContent>
                {topProducts && topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topProducts}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="product_name" 
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value)}
                        tick={{ fontSize: 12 }}
                        width={100}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          name === 'total_amount' ? formatCurrency(value) : value,
                          name === 'total_amount' ? 'Monto' : 'Cantidad'
                        ]}
                        labelFormatter={(value) => `Producto: ${value}`}
                      />
                      <Bar dataKey="total_amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay datos de productos vendidos</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Segunda fila de gráficos */}
          <div className="grid grid-cols-1 gap-6 mt-6">
            {/* Gráfico de tipos de comprobante */}
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Comprobante</CardTitle>
                <CardDescription>Distribución por tipo de comprobante</CardDescription>
              </CardHeader>
              <CardContent>
                {statistics?.by_receipt_type && statistics.by_receipt_type.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statistics.by_receipt_type}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="receipt_type" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value)}
                        tick={{ fontSize: 12 }}
                        width={100}
                      />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value), 'Monto']}
                        labelFormatter={(value) => `Tipo: ${value}`}
                      />
                      <Bar dataKey="total_amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay datos de tipos de comprobante</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen de rendimiento */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Rendimiento</CardTitle>
                <CardDescription>Métricas clave de desempeño</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Ventas este mes:</span>
                  <span className="font-bold">{statistics?.last_30_days?.sales_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Monto este mes:</span>
                  <span className="font-bold">{formatCurrency(statistics?.last_30_days?.total_amount || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Presupuestos:</span>
                  <span className="font-bold">{statistics?.budget_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">IVA Total:</span>
                  <span className="font-bold">{formatCurrency(statistics?.total_iva_amount || 0)}</span>
                </div>
                <Separator />
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-800">Comisión Estimada:</span>
                    <span className="font-bold text-green-900">{formatCurrency(calculateCommission(statistics?.total_amount || 0, commissionPercentage / 100))}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-green-600">Porcentaje:</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={commissionPercentage}
                      onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                      className="w-16 h-6 text-xs"
                    />
                    <span className="text-xs text-green-600">%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {hasPermission('ver_ventas_usuario') && (
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Ventas</CardTitle>
                <CardDescription>Lista detallada de todas las ventas</CardDescription>
              </CardHeader>
              <CardContent>
              <Table>
                <TableHeader>
                  {columnConfig.map((column) => (
                    <ResizableTableHeader
                      key={column.id}
                      columnId={column.id}
                      getResizeHandleProps={getResizeHandleProps}
                      getColumnHeaderProps={getColumnHeaderProps}
                      className="font-medium"
                    >
                      {column.id === 'receipt_number' && 'Número'}
                      {column.id === 'receipt_type' && 'Comprobante'}
                      {column.id === 'customer' && 'Cliente'}
                      {column.id === 'branch' && 'Sucursal'}
                      {column.id === 'items_count' && 'Items'}
                      {column.id === 'subtotal' && 'Subtotal'}
                      {column.id === 'total_iva_amount' && 'IVA'}
                      {column.id === 'total' && 'Total'}
                      {column.id === 'date' && 'Fecha'}
                      {column.id === 'status' && 'Estado'}
                    </ResizableTableHeader>
                  ))}
                </TableHeader>
                <TableBody>
                  {loadingData ? (
                    <TableRow>
                      <TableCell colSpan={columnConfig.length} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Cargando ventas...
                      </TableCell>
                    </TableRow>
                  ) : sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columnConfig.length} className="text-center py-8 text-muted-foreground">
                        No se encontraron ventas para los filtros seleccionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <ResizableTableCell
                          columnId="receipt_number"
                          getColumnCellProps={getColumnCellProps}
                        >
                          {sale.receipt_number || sale.id}
                        </ResizableTableCell>
                        <ResizableTableCell
                          columnId="receipt_type"
                          getColumnCellProps={getColumnCellProps}
                        >
                          {sale.receipt_type}
                        </ResizableTableCell>
                        <ResizableTableCell
                          columnId="customer"
                          getColumnCellProps={getColumnCellProps}
                        >
                          {sale.customer}
                        </ResizableTableCell>
                        <ResizableTableCell
                          columnId="branch"
                          getColumnCellProps={getColumnCellProps}
                        >
                          {sale.branch}
                        </ResizableTableCell>
                        <ResizableTableCell
                          columnId="items_count"
                          getColumnCellProps={getColumnCellProps}
                        >
                          {sale.items_count}
                        </ResizableTableCell>
                        <ResizableTableCell
                          columnId="subtotal"
                          getColumnCellProps={getColumnCellProps}
                        >
                          {formatCurrency(sale.subtotal)}
                        </ResizableTableCell>
                        <ResizableTableCell
                          columnId="total_iva_amount"
                          getColumnCellProps={getColumnCellProps}
                        >
                          {formatCurrency(sale.total_iva_amount)}
                        </ResizableTableCell>
                        <ResizableTableCell
                          columnId="total"
                          getColumnCellProps={getColumnCellProps}
                        >
                          {formatCurrency(sale.total)}
                        </ResizableTableCell>
                        <ResizableTableCell
                          columnId="date"
                          getColumnCellProps={getColumnCellProps}
                        >
                          {formatShortDate(sale.date)}
                        </ResizableTableCell>
                        <ResizableTableCell
                          columnId="status"
                          getColumnCellProps={getColumnCellProps}
                        >
                          <Badge variant={sale.status === 'annulled' ? 'destructive' : 'default'}>
                            {sale.status === 'annulled' ? 'Anulada' : 'Activa'}
                          </Badge>
                        </ResizableTableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Información de paginación mejorada */}
              {salesPagination && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {salesPagination.from} a {salesPagination.to} de {salesPagination.total} ventas
                    {salesPagination.total > 0 && (
                      <span className="ml-2">
                        (Página {salesPagination.current_page} de {salesPagination.last_page})
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1 || loadingData}
                      className="cursor-pointer"
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages || loadingData}
                      className="cursor-pointer"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
