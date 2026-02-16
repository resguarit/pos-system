import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Shipment, ShipmentStage } from '@/types/shipment';
import { shipmentService } from '@/services/shipmentService';
import ShipmentTable from '@/components/shipments/ShipmentTable';
import ShipmentDetail from '@/components/shipments/ShipmentDetail';
import { NewShipmentDialog } from '@/components/shipments/NewShipmentDialog';
import { EditShipmentDialog } from '@/components/shipments/EditShipmentDialog';
import { useAuth } from '@/context/AuthContext';
import { useBranch } from '@/context/BranchContext';
import useApi from '@/hooks/useApi';
import { useMultipleBranchesShipments } from '@/hooks/useMultipleBranchesShipments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Package, Clock, TrendingUp, CheckCircle, AlertCircle, Search, Filter, X, Calendar, RefreshCcw, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SelectBranchPlaceholder from '@/components/ui/select-branch-placeholder';
import Pagination from '@/components/ui/pagination';
import { DatePickerWithRange, DateRange } from '@/components/ui/date-range-picker';


/**
 * Clasificación de Estados de Envío basada en el campo 'order' del stage:
 * - order = 1: Pendiente (Pendiente)
 * - order = 2: En Proceso (Preparación, Procesando, En Preparación, Embalando)
 * - order = 3: En Camino (En Ruta, Enviado, En Tránsito, Fuera para Entrega)
 * - order = 4: Completado (Entregado)
 * - Estados finales: Cancelado, Fallido, Devuelto, Anulado
 */
export default function ShipmentsPage() {
  const navigate = useNavigate();
  const { hasPermission, isLoading: authLoading } = useAuth();
  const { request } = useApi();
  const { selectedBranchIds, branches, setSelectedBranchIds } = useBranch();

  // Estados principales
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stages, setStages] = useState<ShipmentStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewShipment, setShowNewShipment] = useState(false);
  const [showEditShipment, setShowEditShipment] = useState(false);
  const [editingShipmentId, setEditingShipmentId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage] = useState(10);

  // Estados para búsqueda de clientes y transportistas
  const [customerSearch, setCustomerSearch] = useState('');
  const [transporterSearch, setTransporterSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customers, setCustomers] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showTransporterDropdown, setShowTransporterDropdown] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const customerSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transporterSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filters, setFilters] = useState({
    stage_id: '',
    reference: '',
    created_from: '',
    created_to: '',
    priority: '',
    customer: '',
    transporter: '',
    branch: '',
  });

  // Derivar branches seleccionadas desde el contexto
  const selectedBranchIdsArray = useMemo(() =>
    selectedBranchIds?.map(id => parseInt(String(id), 10)).filter(Number.isFinite) || [],
    [selectedBranchIds]
  );

  // Función para obtener información de una sucursal específica
  const getBranchInfo = (branchId: number) => {
    return branches.find(branch => branch.id === branchId || branch.id === String(branchId))
  }

  // Hook para múltiples sucursales
  const {
    allShipments,
    allShipmentsLoading,
    consolidatedStats,
    loadMultipleBranchesShipments
  } = useMultipleBranchesShipments({ selectedBranchIdsArray })

  // Estados para recordar la selección original
  const [originalBranchSelection, setOriginalBranchSelection] = useState<string[]>([])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [backendStats, setBackendStats] = useState<any>(null);

  const fetchData = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const stagesResponse = await shipmentService.getStages();
      setStages(Array.isArray(stagesResponse) ? stagesResponse : []);

      // Obtener el array actual de sucursales (este callback se recrea cuando cambian)
      const currentBranchIds = selectedBranchIds?.map(id => parseInt(String(id), 10)).filter(Number.isFinite) || [];

      // Verificar si hay múltiples sucursales seleccionadas
      const hasMultipleBranches = currentBranchIds.length > 1;

      if (hasMultipleBranches) {
        // Cargar envíos de múltiples sucursales
        await loadMultipleBranchesShipments({ ...filters, per_page: perPage, page });
        // Las estadísticas vienen del hook useMultipleBranchesShipments
      } else {
        // Cargar envíos de una sola sucursal
        const shipmentsResponse = await shipmentService.getShipments({ ...filters, per_page: perPage, page });
        const shipmentsData = Array.isArray(shipmentsResponse.data)
          ? shipmentsResponse.data
          : [];
        setShipments(shipmentsData);

        // Guardar información de paginación
        if (shipmentsResponse.meta) {
          setCurrentPage(shipmentsResponse.meta.current_page || 1);
          setTotalPages(shipmentsResponse.meta.last_page || 1);
          setTotalItems(shipmentsResponse.meta.total || 0);
        }

        // Guardar estadísticas del backend
        if (shipmentsResponse && 'stats' in shipmentsResponse && shipmentsResponse.stats) {
          setBackendStats(shipmentsResponse.stats);
        }
      }
    } catch (err) {
      setError('Error al cargar los envíos');
      console.error('Error fetching data:', err);
      setShipments([]);
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchIds, filters, loadMultipleBranchesShipments, perPage]);

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission('ver_envios')) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Efecto separado para fetchData que depende de selección de sucursales y filtros
  useEffect(() => {
    if (!authLoading && hasPermission('ver_envios')) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  // Debounced server-side search for customers
  const searchCustomersDebounced = useCallback((term: string) => {
    if (customerSearchTimerRef.current) clearTimeout(customerSearchTimerRef.current);
    setSearchingCustomers(true);
    customerSearchTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (term.trim()) params.append('search', term.trim());
        const response = await request({ method: 'GET', url: `/customers?${params.toString()}` });
        if (response?.data) {
          const customersData = Array.isArray(response.data) ? response.data : response.data.data || [];
          setCustomers(customersData);
        }
      } catch (error) {
        console.error('Error searching customers:', error);
        setCustomers([]);
      } finally {
        setSearchingCustomers(false);
      }
    }, 300);
  }, [request]);

  // Debounced server-side search for transportistas
  const searchUsersDebounced = useCallback((term: string) => {
    if (transporterSearchTimerRef.current) clearTimeout(transporterSearchTimerRef.current);
    setSearchingUsers(true);
    transporterSearchTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (term.trim()) params.append('search', term.trim());
        params.append('limit', '20');
        const response = await request({ method: 'GET', url: `/users?${params.toString()}` });
        if (response?.data) {
          const usersData = Array.isArray(response.data) ? response.data : response.data.data || [];
          setUsers(usersData);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setUsers([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);
  }, [request]);

  // Función para ver detalles de una sucursal específica
  // Función para volver a la vista de múltiples sucursales
  const handleGoBackToMultipleBranches = () => {
    if (originalBranchSelection.length > 1) {
      setSelectedBranchIds([...originalBranchSelection])
      setOriginalBranchSelection([])
      toast.success('Volviendo a la vista de múltiples sucursales')
    } else {
      const allBranchIds = branches.map(branch => branch.id.toString())
      setSelectedBranchIds(allBranchIds)
      setOriginalBranchSelection([])
      toast.success('Mostrando todas las sucursales')
    }
  }

  // Filtrar por término de búsqueda y filtros adicionales
  const filteredShipments = useMemo(() => {
    let filtered = selectedBranchIdsArray.length > 1 ? allShipments : shipments;

    // Filtrar por search term
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.reference?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por prioridad
    if (filters.priority) {
      filtered = filtered.filter(s => s.priority === filters.priority);
    }

    // Filtrar por cliente
    if (filters.customer) {
      filtered = filtered.filter(s => {
        const customerId = s.sales && s.sales.length > 0 ? s.sales[0].customer_id : null;
        return customerId?.toString() === filters.customer;
      });
    }

    // Filtrar por transportista
    if (filters.transporter) {
      filtered = filtered.filter(s =>
        s.metadata?.transportista_id?.toString() === filters.transporter
      );
    }

    // Filtrar por sucursal
    if (filters.branch && selectedBranchIdsArray.length > 1) {
      filtered = filtered.filter(s => {
        const branchIdStr = s.branch_id?.toString() || '';
        return branchIdStr === filters.branch;
      });
    }

    return filtered;
  }, [shipments, allShipments, searchTerm, filters, selectedBranchIdsArray.length]);

  // Calcular estadísticas - Ahora vienen del backend
  const stats = useMemo(() => {
    if (selectedBranchIdsArray.length > 1 && consolidatedStats) {
      return {
        total: consolidatedStats.total || allShipments.length,
        pending: consolidatedStats.total_pending || 0,
        inProgress: consolidatedStats.total_in_transit || 0,
        completed: consolidatedStats.total_delivered || 0,
      };
    }

    // Para una sola sucursal, usar estadísticas del backend
    if (backendStats) {
      return {
        total: backendStats.total || shipments.length,
        pending: backendStats.total_pending || 0,
        inProgress: backendStats.total_in_transit || 0,
        completed: backendStats.total_delivered || 0,
      };
    }

    // Fallback: calcular en frontend si no hay estadísticas del backend
    const shipmentsToAnalyze = shipments;
    return {
      total: shipmentsToAnalyze.length,
      pending: shipmentsToAnalyze.filter(s => s.current_stage?.name === 'Pendiente').length,
      inProgress: shipmentsToAnalyze.filter(s => s.current_stage?.order === 2 || s.current_stage?.order === 3).length,
      completed: shipmentsToAnalyze.filter(s => s.current_stage?.order === 4).length,
    };
  }, [shipments, allShipments, consolidatedStats, backendStats, selectedBranchIdsArray.length]);

  const dateRangeValue: DateRange | undefined = useMemo(() => {
    if (!filters.created_from) return undefined;
    return {
      from: new Date(filters.created_from + 'T12:00:00'), // Add time to avoid timezone issues
      to: filters.created_to ? new Date(filters.created_to + 'T12:00:00') : undefined
    };
  }, [filters.created_from, filters.created_to]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchData(1);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters({
      stage_id: '',
      reference: '',
      created_from: '',
      created_to: '',
      priority: '',
      customer: '',
      transporter: '',
      branch: '',
    });
    setCustomerSearch('');
    setTransporterSearch('');
    setCurrentPage(1);
    setTimeout(() => fetchData(1), 100);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      // Ajustar a medianoche local o string directo YYYY-MM-DD
      const from = format(range.from, 'yyyy-MM-dd');
      const to = range.to ? format(range.to, 'yyyy-MM-dd') : '';
      setFilters(prev => ({ ...prev, created_from: from, created_to: to }));
    } else {
      // Si es undefined (limpiar), borrar filtros
      setFilters(prev => ({ ...prev, created_from: '', created_to: '' }));
      // Opcional: Auto-refrescar si se desea comportamiento inmediato al limpiar
    }
  };

  if (!hasPermission('ver_envios')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin permisos</h3>
          <p className="text-gray-600">No tienes permisos para ver envíos.</p>
        </div>
      </div>
    );
  }

  // Render condicional al inicio del componente
  if (selectedBranchIdsArray.length === 0) {
    return <SelectBranchPlaceholder />
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyDatePreset = (preset: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    let from = '';
    const to = format(today, 'yyyy-MM-dd');

    switch (preset) {
      case 'today':
        from = format(today, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        from = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'week':
        from = format(lastWeek, 'yyyy-MM-dd');
        break;
    }

    setFilters(prev => ({ ...prev, created_from: from, created_to: to }));
  };

  const handleViewShipment = (shipmentId: number) => {
    navigate(`/dashboard/envios/${shipmentId}`);
  };

  const handleCloseDetail = (open: boolean) => {
    setShowDetail(open);
    if (!open) {
      setSelectedShipment(null);
    }
  };

  const handleEditShipmentClick = (shipmentId: number) => {
    setEditingShipmentId(shipmentId);
    setShowEditShipment(true);
  };

  const handleNewShipment = () => {
    setShowNewShipment(true);
  };

  const handleShipmentCreated = () => {
    fetchData();
  };

  const handlePrintShipment = async (shipmentId: number) => {
    try {
      const shipment = shipments.find(s => s.id === shipmentId) || allShipments.find(s => s.id === shipmentId);
      if (!shipment) {
        toast.error('Envío no encontrado');
        return;
      }

      toast.success(`Generando etiqueta para envío ${shipment.reference || shipmentId}...`);

      // Descargar el PDF con autenticación usando request (incluye token)
      const response = await request({
        method: 'GET',
        url: `/shipments/${shipmentId}/pdf`,
        responseType: 'blob'
      });

      if (!response || !(response instanceof Blob)) {
        throw new Error("La respuesta del servidor no es un archivo PDF válido.");
      }

      // Crear blob URL del PDF descargado
      const blob = new Blob([response], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);

      // Crear iframe oculto para imprimir
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';

      // Agregar al DOM
      document.body.appendChild(iframe);

      // Asignar blob URL al iframe
      iframe.src = blobUrl;

      // Cuando el iframe cargue, ejecutar print
      iframe.onload = () => {
        setTimeout(() => {
          try {
            // Ejecutar impresión desde el iframe
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            toast.error("No se pudo abrir el diálogo de impresión.");
          }

          // Limpiar después de un tiempo
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            window.URL.revokeObjectURL(blobUrl);
          }, 1000);
        }, 500);
      };

      // Timeout de seguridad
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 30000);

    } catch (error) {
      toast.error('Error al imprimir etiqueta');
      console.error('Print error:', error);
    }
  };

  const handleDownloadShipment = async (shipmentId: number) => {
    try {
      const shipment = shipments.find(s => s.id === shipmentId) || allShipments.find(s => s.id === shipmentId);
      if (!shipment) {
        toast.error('Envío no encontrado');
        return;
      }

      toast.success(`Descargando etiqueta para envío ${shipment.reference || shipmentId}...`);

      // Descargar el PDF con autenticación usando request (incluye token)
      const response = await request({
        method: 'GET',
        url: `/shipments/${shipmentId}/pdf`,
        responseType: 'blob'
      });

      if (!response || !(response instanceof Blob)) {
        throw new Error("La respuesta del servidor no es un archivo PDF válido.");
      }

      // Crear blob del PDF descargado
      const blob = new Blob([response], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);

      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `etiqueta-envio-${shipment.reference || shipmentId}.pdf`;

      // Agregar al DOM, hacer clic y remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpiar el blob URL
      window.URL.revokeObjectURL(blobUrl);

      toast.success('Etiqueta descargada correctamente');
    } catch (error) {
      toast.error('Error al descargar etiqueta');
      console.error('Download error:', error);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchData(currentPage);
      toast.success('Datos actualizados');
    } catch {
      toast.error('Error al actualizar datos');
    } finally {
      setLoading(false);
    }
  };

  // Función de paginación
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchData(newPage);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Breadcrumb para una sola sucursal */}
      {selectedBranchIdsArray.length === 1 && originalBranchSelection.length > 1 && (
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoBackToMultipleBranches}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Todas las sucursales</span>
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Envíos
            {selectedBranchIdsArray.length > 1 && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                ({selectedBranchIdsArray.length} sucursales)
              </span>
            )}
            {selectedBranchIdsArray.length === 1 && originalBranchSelection.length > 1 && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                - {getBranchInfo(selectedBranchIdsArray[0])?.description || `Sucursal ${selectedBranchIdsArray[0]}`}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
            Gestiona los envíos y su seguimiento por etapas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard/envios/etapas')}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Configurar Etapas
          </Button>
          {hasPermission('crear_envios') && (
            <Button onClick={handleNewShipment} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Envío
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Envíos</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {selectedBranchIdsArray.length > 1 ? `De ${selectedBranchIdsArray.length} sucursales` : 'Envíos registrados'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">En espera</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">En curso</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Entregados</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por referencia o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Filtros Avanzados</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <Select
                  value={filters.stage_id || 'all'}
                  onValueChange={(value) => handleFilterChange('stage_id', value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id.toString()}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por sucursal - Solo mostrar si hay múltiples sucursales */}
              {selectedBranchIdsArray.length > 1 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Sucursal</label>
                  <Select
                    value={filters.branch || 'all'}
                    onValueChange={(value) => handleFilterChange('branch', value === 'all' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {selectedBranchIdsArray.map((branchId) => {
                        const branchInfo = getBranchInfo(branchId);
                        return (
                          <SelectItem key={branchId} value={branchId.toString()}>
                            {branchInfo?.description || `Sucursal ${branchId}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Prioridad</label>
                <Select
                  value={filters.priority || 'all'}
                  onValueChange={(value) => handleFilterChange('priority', value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <label className="text-sm font-medium mb-2 block">Cliente</label>
                <Input
                  placeholder="Buscar cliente..."
                  value={customerSearch}
                  onFocus={() => {
                    setShowCustomerDropdown(true);
                    if (customers.length === 0) searchCustomersDebounced('');
                  }}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    searchCustomersDebounced(e.target.value);
                    if (!e.target.value) {
                      handleFilterChange('customer', '');
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                />
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchingCustomers ? (
                      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Buscando...
                      </div>
                    ) : customers.length > 0 ? (
                      customers.map(customer => (
                        <div
                          key={customer.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const name = customer.person
                              ? [customer.person.first_name, customer.person.last_name].filter(Boolean).join(' ').trim()
                              : (customer as { business_name?: string })?.business_name?.trim() || customer.email || `ID: ${customer.id}`;
                            setCustomerSearch(name || 'Sin nombre');
                            handleFilterChange('customer', customer.id.toString());
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <div className="text-sm font-medium">
                            {(() => {
                              const displayName = customer.person
                                ? [customer.person.first_name, customer.person.last_name].filter(Boolean).join(' ').trim()
                                : (customer as { business_name?: string })?.business_name?.trim();
                              return displayName || customer.email || 'Sin nombre';
                            })()}
                          </div>
                          {customer.email && <div className="text-xs text-gray-500">{customer.email}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                        {customerSearch.trim() ? 'No se encontraron clientes' : 'Escriba para buscar'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="text-sm font-medium mb-2 block">Transportista</label>
                <Input
                  placeholder="Buscar transportista..."
                  value={transporterSearch}
                  onFocus={() => {
                    setShowTransporterDropdown(true);
                    if (users.length === 0) searchUsersDebounced('');
                  }}
                  onChange={(e) => {
                    setTransporterSearch(e.target.value);
                    setShowTransporterDropdown(true);
                    searchUsersDebounced(e.target.value);
                    if (!e.target.value) {
                      handleFilterChange('transporter', '');
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowTransporterDropdown(false), 200)}
                />
                {showTransporterDropdown && (
                  <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchingUsers ? (
                      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Buscando...
                      </div>
                    ) : users.length > 0 ? (
                      users.map(user => (
                        <div
                          key={user.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const name = user.person
                              ? `${user.person.first_name} ${user.person.last_name}`.trim()
                              : user.username || user.email || `ID: ${user.id}`;
                            setTransporterSearch(name);
                            handleFilterChange('transporter', user.id.toString());
                            setShowTransporterDropdown(false);
                          }}
                        >
                          <div className="text-sm font-medium">
                            {user.person
                              ? `${user.person.first_name} ${user.person.last_name}`.trim()
                              : user.username || 'Sin nombre'}
                          </div>
                          {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                        {transporterSearch.trim() ? 'No se encontraron transportistas' : 'Escriba para buscar'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Referencia</label>
                <Input
                  placeholder="Referencia..."
                  value={filters.reference}
                  onChange={(e) => handleFilterChange('reference', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fechas Rápidas
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyDatePreset('today')}
                  >
                    Hoy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyDatePreset('yesterday')}
                  >
                    Ayer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyDatePreset('week')}
                  >
                    Últimos 7 días
                  </Button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Rango de Fechas</label>
                <DatePickerWithRange
                  selected={dateRangeValue}
                  onSelect={handleDateRangeChange}
                  showClearButton={true}
                  onClear={() => handleDateRangeChange(undefined)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleClearFilters}>
                Limpiar
              </Button>
              <Button onClick={handleApplyFilters}>
                Aplicar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        </div>
      )}


      {/* Shipments Table */}
      <ShipmentTable
        shipments={filteredShipments}
        stages={stages}
        onViewShipment={handleViewShipment}
        onEditShipment={handleEditShipmentClick}
        onPrintShipment={handlePrintShipment}
        onDownloadShipment={handleDownloadShipment}
        loading={loading || allShipmentsLoading}
        showBranchColumn={selectedBranchIdsArray.length > 1}
        getBranchInfo={getBranchInfo}
      />

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          lastPage={totalPages}
          total={totalItems}
          itemName="envíos"
          onPageChange={handlePageChange}
          disabled={loading}
        />
      )}

      {/* Shipment Detail Modal */}
      <ShipmentDetail
        shipmentId={selectedShipment || 0}
        open={showDetail && !!selectedShipment}
        onOpenChange={handleCloseDetail}
      />

      {/* New Shipment Dialog */}
      <NewShipmentDialog
        open={showNewShipment}
        onOpenChange={setShowNewShipment}
        stages={stages}
        onSuccess={handleShipmentCreated}
      />

      {/* Edit Shipment Dialog */}
      <EditShipmentDialog
        open={showEditShipment}
        onOpenChange={setShowEditShipment}
        shipmentId={editingShipmentId}
        stages={stages}
        onSuccess={handleShipmentCreated}
      />
    </div>
  );
}
