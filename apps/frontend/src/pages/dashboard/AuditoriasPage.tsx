import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, Search, X, User, FileText, Activity, Database, FileBarChart, Users, ChevronDown, Check } from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import useApi from '@/hooks/useApi';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { sileo } from "sileo"
import type { AuditActivity, AuditFilters, AuditStatistics, AuditFilterOptions } from '@/types/audit';
import { useAuth } from '@/hooks/useAuth';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { ResizableTableHeader } from '@/components/ui/resizable-table-header';

export default function AuditoriasPage() {
  const { request, loading } = useApi();
  const { hasPermission } = useAuth();
  const [audits, setAudits] = useState<AuditActivity[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [filterOptions, setFilterOptions] = useState<AuditFilterOptions | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<AuditActivity | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage, setPerPage] = useState(50);

  // Configuración de columnas redimensionables
  const columnConfig = [
    { id: 'fecha', minWidth: 150, maxWidth: 250, defaultWidth: 180 },
    { id: 'usuario', minWidth: 120, maxWidth: 250, defaultWidth: 180 },
    { id: 'accion', minWidth: 200, maxWidth: 400, defaultWidth: 300 },
    { id: 'modelo', minWidth: 150, maxWidth: 300, defaultWidth: 200 },
    { id: 'log_name', minWidth: 100, maxWidth: 200, defaultWidth: 120 },
    { id: 'acciones', minWidth: 80, maxWidth: 120, defaultWidth: 100 },
  ];

  const {
    getResizeHandleProps,
    getColumnHeaderProps,
    getColumnCellProps,
    tableRef
  } = useResizableColumns({
    columns: columnConfig,
    storageKey: 'auditorias-column-widths',
    defaultWidth: 150
  });

  // Filtros
  const [filters, setFilters] = useState<AuditFilters>({
    user_id: undefined,
    subject_type: undefined,
    log_name: undefined,
    event: undefined,
    search: undefined,
    date_from: undefined,
    date_to: undefined,
  });


  // Cargar opciones de filtros
  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await request({
        method: 'GET',
        url: '/audits/filter-options',
      });

      if (response?.success && response.data) {
        setFilterOptions({
          subject_types: response.data.subject_types || [],
          log_names: response.data.log_names || [],
          users: response.data.users || [],
        });
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  }, [request]);

  // Cargar estadísticas
  const loadStatistics = useCallback(async () => {
    try {
      const params: any = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const response = await request({
        method: 'GET',
        url: '/audits/statistics',
        params,
      });

      if (response?.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }, [request, filters.date_from, filters.date_to]);

  // Cargar auditorías
  const loadAudits = useCallback(async (page = 1) => {
    try {
      const params: any = {
        page,
        per_page: perPage,
      };

      // Agregar filtros
      Object.keys(filters).forEach((key) => {
        const value = filters[key as keyof AuditFilters];
        if (value !== undefined && value !== null && value !== '') {
          params[key] = value;
        }
      });

      const response = await request({
        method: 'GET',
        url: '/audits',
        params,
      });

      if (response?.success) {
        setAudits(response.data || []);
        if (response.meta) {
          setCurrentPage(response.meta.current_page || page);
          setTotalPages(response.meta.last_page || 1);
          setTotalItems(response.meta.total || 0);
        }
      }
    } catch (error) {
      console.error('Error loading audits:', error);
      sileo.error({ title: 'Error al cargar las auditorías' });
      setAudits([]);
    }
  }, [request, filters, perPage]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    loadAudits(1);
  }, [loadAudits]);

  const handleFilterChange = (key: keyof AuditFilters, value: any) => {
    setFilters((prev) => {
      let processedValue = value === '' || value === 'all' ? undefined : value;
      
      // Convertir user_id a número si es necesario
      if (key === 'user_id' && processedValue !== undefined) {
        processedValue = Number(processedValue);
      }
      
      return {
        ...prev,
        [key]: processedValue,
      };
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      user_id: undefined,
      subject_type: undefined,
      log_name: undefined,
      event: undefined,
      search: undefined,
      date_from: undefined,
      date_to: undefined,
    });
    setCurrentPage(1);
  };

  const handleViewDetails = (audit: AuditActivity) => {
    setSelectedAudit(audit);
    setIsDetailOpen(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: es });
    } catch {
      return dateString;
    }
  };

  const getUserName = (audit: AuditActivity) => {
    if (audit.causer?.person) {
      return `${audit.causer.person.first_name} ${audit.causer.person.last_name}`.trim();
    }
    return 'Sistema';
  };

  const getSubjectName = (audit: AuditActivity) => {
    if (!audit.subject_type) return 'N/A';
    
    // Mapeo de nombres técnicos a nombres amigables (sin revelar estructura interna)
    const friendlyNames: Record<string, string> = {
      'App\\Models\\Product': 'Producto',
      'App\\Models\\SaleHeader': 'Venta',
      'App\\Models\\PurchaseOrder': 'Orden de Compra',
      'App\\Models\\PurchaseOrderItem': 'Item de Orden',
      'App\\Models\\Customer': 'Cliente',
      'App\\Models\\Supplier': 'Proveedor',
      'App\\Models\\User': 'Usuario',
      'App\\Models\\Stock': 'Stock',
      'App\\Models\\Category': 'Categoría',
      'App\\Models\\Branch': 'Sucursal',
      'App\\Models\\CashMovement': 'Movimiento de Caja',
      'App\\Models\\CashRegister': 'Caja Registradora',
      'App\\Models\\CurrentAccountMovement': 'Movimiento Cuenta Corriente',
      'App\\Models\\Person': 'Persona',
      'App\\Models\\CurrentAccount': 'Cuenta Corriente',
      'App\\Models\\SaleItem': 'Item de Venta',
      'App\\Models\\PaymentMethod': 'Método de Pago',
      'App\\Models\\Role': 'Rol',
      'App\\Models\\Permission': 'Permiso',
    };
    
    const typeName = friendlyNames[audit.subject_type] || 
                     audit.subject_type.split('\\').pop()?.replace(/([A-Z])/g, ' $1').trim() || 
                     'Registro';
    
    return `${typeName} #${audit.subject_id || 'N/A'}`;
  };

  const getEventBadge = (event: string | null) => {
    if (!event) return null;
    
    const eventLabels: Record<string, { label: string; className: string }> = {
      created: { label: 'Creado', className: 'bg-green-100 text-green-800 border-green-300' },
      updated: { label: 'Actualizado', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      deleted: { label: 'Eliminado', className: 'bg-red-100 text-red-800 border-red-300' },
      restored: { label: 'Restaurado', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    };

    const config = eventLabels[event.toLowerCase()] || { 
      label: event, 
      className: 'bg-gray-100 text-gray-800 border-gray-300' 
    };
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getActionDescription = (audit: AuditActivity) => {
    // Si hay un evento, eliminar cualquier referencia al evento en la descripción
    const event = audit.event?.toLowerCase();
    if (!event) {
      return audit.description;
    }

    // Mapeo de eventos en inglés y español
    const eventWords = {
      'created': ['created', 'creado', 'crear', 'creating'],
      'updated': ['updated', 'actualizado', 'update', 'updating', 'actualizar'],
      'deleted': ['deleted', 'eliminado', 'delete', 'deleting', 'eliminar'],
      'restored': ['restored', 'restaurado', 'restore', 'restoring', 'restaurar'],
    };

    const wordsToRemove = eventWords[event] || [event];
    let description = audit.description.trim();

    // Verificar si la descripción es solo el evento (sin más información)
    const isOnlyEvent = wordsToRemove.some(word => {
      const regex = new RegExp(`^${word}$`, 'i');
      return regex.test(description);
    });

    // Si la descripción es solo el evento, retornar null para no mostrar nada
    if (isOnlyEvent) {
      return null;
    }

    // Eliminar palabras del evento al inicio de la descripción
    wordsToRemove.forEach(word => {
      const regex = new RegExp(`^${word}\\s+`, 'i');
      description = description.replace(regex, '');
    });

    // También eliminar si aparece en cualquier parte (por si acaso)
    wordsToRemove.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      description = description.replace(regex, '').trim();
    });

    // Limpiar espacios múltiples
    description = description.replace(/\s+/g, ' ').trim();

    // Si después de limpiar no queda nada, no mostrar texto
    if (!description || description.length === 0) {
      return null;
    }

    return description;
  };

  const getLogNameLabel = (logName: string | null) => {
    if (!logName) return 'N/A';
    
    const labels: Record<string, string> = {
      'product': 'Producto',
      'purchase_order': 'Orden de Compra',
      'purchase_order_item': 'Item de Orden',
      'sale': 'Venta',
      'customer': 'Cliente',
      'supplier': 'Proveedor',
      'user': 'Usuario',
      'stock': 'Stock',
      'category': 'Categoría',
      'branch': 'Sucursal',
      'cash_movement': 'Movimiento de Caja',
      'cash_register': 'Caja Registradora',
      'current_account_movement': 'Movimiento Cuenta Corriente',
      'person': 'Persona',
      'person_type': 'Tipo de Persona',
      'current_account': 'Cuenta Corriente',
      'sale_item': 'Item de Venta',
      'payment_method': 'Método de Pago',
      'role': 'Rol',
      'permission': 'Permiso',
    };
    
    return labels[logName.toLowerCase()] || logName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSubjectTypeLabel = (subjectType: string) => {
    const friendlyNames: Record<string, string> = {
      'App\\Models\\Product': 'Producto',
      'App\\Models\\SaleHeader': 'Venta',
      'App\\Models\\PurchaseOrder': 'Orden de Compra',
      'App\\Models\\PurchaseOrderItem': 'Item de Orden',
      'App\\Models\\Customer': 'Cliente',
      'App\\Models\\Supplier': 'Proveedor',
      'App\\Models\\User': 'Usuario',
      'App\\Models\\Stock': 'Stock',
      'App\\Models\\Category': 'Categoría',
      'App\\Models\\Branch': 'Sucursal',
      'App\\Models\\CashMovement': 'Movimiento de Caja',
      'App\\Models\\CashRegister': 'Caja Registradora',
      'App\\Models\\CurrentAccountMovement': 'Movimiento Cuenta Corriente',
      'App\\Models\\Person': 'Persona',
      'App\\Models\\CurrentAccount': 'Cuenta Corriente',
      'App\\Models\\SaleItem': 'Item de Venta',
      'App\\Models\\PaymentMethod': 'Método de Pago',
      'App\\Models\\Role': 'Rol',
      'App\\Models\\Permission': 'Permiso',
    };
    
    return friendlyNames[subjectType] || 
           subjectType.split('\\').pop()?.replace(/([A-Z])/g, ' $1').trim() || 
           subjectType;
  };

  const getFieldLabel = (fieldName: string): string => {
    const fieldLabels: Record<string, string> = {
      'name': 'Nombre',
      'description': 'Descripción',
      'price': 'Precio',
      'cost': 'Costo',
      'stock': 'Stock',
      'quantity': 'Cantidad',
      'active': 'Activo',
      'email': 'Email',
      'username': 'Usuario',
      'first_name': 'Nombre',
      'last_name': 'Apellido',
      'address': 'Dirección',
      'phone': 'Teléfono',
      'cuit': 'CUIT',
      'business_name': 'Razón Social',
      'credit_limit': 'Límite de Crédito',
      'current_balance': 'Saldo Actual',
      'purchase_price': 'Precio de Compra',
      'sale_price': 'Precio de Venta',
      'subtotal': 'Subtotal',
      'total': 'Total',
      'discount': 'Descuento',
      'date': 'Fecha',
      'created_at': 'Fecha de Creación',
      'updated_at': 'Fecha de Actualización',
      'role_id': 'Rol',
      'category_id': 'Categoría',
      'branch_id': 'Sucursal',
      'supplier_id': 'Proveedor',
      'customer_id': 'Cliente',
      'product_id': 'Producto',
      'fiscal_condition_id': 'Condición Fiscal',
      'person_type_id': 'Tipo de Persona',
    };
    
    return fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') {
      // Si es un número grande, podría ser un ID o un precio
      if (value > 1000000) {
        return value.toLocaleString('es-AR');
      }
      // Si tiene decimales, formatear como moneda o número decimal
      if (value % 1 !== 0) {
        return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return value.toLocaleString('es-AR');
    }
    if (typeof value === 'string') {
      // Intentar detectar si es una fecha
      const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        try {
          return formatDate(value);
        } catch {
          return value;
        }
      }
      return value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const renderPropertiesList = (properties: Record<string, any>, title: string) => {
    if (!properties || Object.keys(properties).length === 0) return null;

    const renderValue = (value: any, level: number = 0): React.ReactNode => {
      // Si es un objeto anidado, renderizar sus propiedades
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const entries = Object.entries(value).filter(([k]) => 
          !['ip_address', 'user_agent', 'url', 'method'].includes(k)
        );
        
        if (entries.length === 0) return null;

        return (
          <div className="space-y-1.5">
            {entries.map(([nestedKey, nestedValue]) => {
              // Si el valor anidado es también un objeto, renderizarlo recursivamente
              if (typeof nestedValue === 'object' && nestedValue !== null && !Array.isArray(nestedValue)) {
                const nestedEntries = Object.entries(nestedValue);
                if (nestedEntries.length === 0) return null;

                return (
                  <div key={nestedKey} className="pl-3 border-l-2 border-border/30">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {getFieldLabel(nestedKey)}:
                    </div>
                    <div className="space-y-1">
                      {nestedEntries.map(([deepKey, deepValue]) => (
                        <div key={deepKey} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground min-w-[100px]">
                            {getFieldLabel(deepKey)}:
                          </span>
                          <span>{formatFieldValue(deepValue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // Para valores simples dentro de objetos anidados
              return (
                <div key={nestedKey} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground font-medium min-w-[120px]">
                    {getFieldLabel(nestedKey)}:
                  </span>
                  <span>{formatFieldValue(nestedValue)}</span>
                </div>
              );
            })}
          </div>
        );
      }

      // Para valores simples, mostrar directamente
      return <span className="text-sm">{formatFieldValue(value)}</span>;
    };

    return (
      <div>
        <Label className="font-semibold mb-2 block">{title}</Label>
        <div className="bg-muted rounded-md p-4 space-y-3 max-h-60 overflow-y-auto">
          {Object.entries(properties).map(([key, value]) => {
            // Omitir campos técnicos
            if (['ip_address', 'user_agent', 'url', 'method'].includes(key)) {
              return null;
            }

            const content = renderValue(value);
            if (!content) return null;

            return (
              <div key={key} className="pb-3 border-b border-border/50 last:border-0 last:pb-0">
                <div className="font-medium text-sm text-muted-foreground mb-2">
                  {getFieldLabel(key)}:
                </div>
                <div className="text-sm">
                  {content}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== null && v !== ''
  ).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auditorías del Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Registro completo de todas las acciones realizadas en el sistema
        </p>
      </div>

      {/* Estadísticas */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border border-gray-200 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Auditorías</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{statistics.total.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Áreas Monitoreadas</CardTitle>
              <Database className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(statistics.by_subject_type).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Secciones del sistema con actividad
              </p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tipos de Registros</CardTitle>
              <FileBarChart className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(statistics.by_log_name).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Clasificaciones de acciones
              </p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Usuarios Activos</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{statistics.top_users.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar en descripciones y nombres de usuarios..."
              className="w-full pl-8"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Dropdown para Usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between min-w-[160px]">
                {filters.user_id 
                  ? filterOptions?.users.find(u => u.id === filters.user_id)?.name || 'Usuario'
                  : 'Todos los usuarios'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] max-h-[300px] overflow-y-auto">
              <DropdownMenuItem onClick={() => handleFilterChange('user_id', undefined)}>
                <Check className={`mr-2 h-4 w-4 ${!filters.user_id ? 'opacity-100' : 'opacity-0'}`} />
                Todos los usuarios
              </DropdownMenuItem>
              {filterOptions?.users.map((user) => (
                <DropdownMenuItem 
                  key={user.id} 
                  onClick={() => handleFilterChange('user_id', user.id)}
                >
                  <Check className={`mr-2 h-4 w-4 ${filters.user_id === user.id ? 'opacity-100' : 'opacity-0'}`} />
                  {user.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dropdown para Área del Sistema */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between min-w-[180px]">
                {filters.subject_type 
                  ? getSubjectTypeLabel(filters.subject_type)
                  : 'Todas las áreas'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] max-h-[300px] overflow-y-auto">
              <DropdownMenuItem onClick={() => handleFilterChange('subject_type', undefined)}>
                <Check className={`mr-2 h-4 w-4 ${!filters.subject_type ? 'opacity-100' : 'opacity-0'}`} />
                Todas las áreas
              </DropdownMenuItem>
              {filterOptions?.subject_types.map((type) => (
                <DropdownMenuItem 
                  key={type} 
                  onClick={() => handleFilterChange('subject_type', type)}
                >
                  <Check className={`mr-2 h-4 w-4 ${filters.subject_type === type ? 'opacity-100' : 'opacity-0'}`} />
                  {getSubjectTypeLabel(type)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dropdown para Evento */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between min-w-[140px]">
                {filters.event === 'created' ? 'Creado' :
                 filters.event === 'updated' ? 'Actualizado' :
                 filters.event === 'deleted' ? 'Eliminado' :
                 'Todos los eventos'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[140px]">
              <DropdownMenuItem onClick={() => handleFilterChange('event', undefined)}>
                <Check className={`mr-2 h-4 w-4 ${!filters.event ? 'opacity-100' : 'opacity-0'}`} />
                Todos los eventos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('event', 'created')}>
                <Check className={`mr-2 h-4 w-4 ${filters.event === 'created' ? 'opacity-100' : 'opacity-0'}`} />
                Creado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('event', 'updated')}>
                <Check className={`mr-2 h-4 w-4 ${filters.event === 'updated' ? 'opacity-100' : 'opacity-0'}`} />
                Actualizado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('event', 'deleted')}>
                <Check className={`mr-2 h-4 w-4 ${filters.event === 'deleted' ? 'opacity-100' : 'opacity-0'}`} />
                Eliminado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botón para limpiar filtros */}
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Tabla de Auditorías */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Registro de Auditorías</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Por página:</Label>
              <Select
                value={perPage.toString()}
                onValueChange={(value) => {
                  setPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : audits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron auditorías
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table ref={tableRef}>
                  <TableHeader>
                    <TableRow>
                      <ResizableTableHeader
                        columnId="fecha"
                        getResizeHandleProps={getResizeHandleProps}
                        getColumnHeaderProps={getColumnHeaderProps}
                      >
                        Fecha/Hora
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnId="usuario"
                        getResizeHandleProps={getResizeHandleProps}
                        getColumnHeaderProps={getColumnHeaderProps}
                      >
                        Usuario
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnId="accion"
                        getResizeHandleProps={getResizeHandleProps}
                        getColumnHeaderProps={getColumnHeaderProps}
                      >
                        Acción
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnId="modelo"
                        getResizeHandleProps={getResizeHandleProps}
                        getColumnHeaderProps={getColumnHeaderProps}
                      >
                        Registro Afectado
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnId="log_name"
                        getResizeHandleProps={getResizeHandleProps}
                        getColumnHeaderProps={getColumnHeaderProps}
                      >
                        Categoría
                      </ResizableTableHeader>
                      <ResizableTableHeader
                        columnId="acciones"
                        getResizeHandleProps={getResizeHandleProps}
                        getColumnHeaderProps={getColumnHeaderProps}
                      >
                        Acciones
                      </ResizableTableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((audit) => (
                      <TableRow key={audit.id}>
                        <TableCell {...getColumnCellProps('fecha')} className="font-mono text-sm">
                          {formatDate(audit.created_at)}
                        </TableCell>
                        <TableCell {...getColumnCellProps('usuario')}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {getUserName(audit)}
                          </div>
                        </TableCell>
                        <TableCell {...getColumnCellProps('accion')}>
                          <div className="flex items-center gap-2">
                            {getEventBadge(audit.event)}
                            {(() => {
                              const description = getActionDescription(audit);
                              return description ? (
                                <span className="text-sm text-muted-foreground">
                                  {description}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell {...getColumnCellProps('modelo')}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{getSubjectName(audit)}</span>
                          </div>
                        </TableCell>
                        <TableCell {...getColumnCellProps('log_name')}>
                          <span className="text-sm text-muted-foreground">
                            {getLogNameLabel(audit.log_name)}
                          </span>
                        </TableCell>
                        <TableCell {...getColumnCellProps('acciones')}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(audit)}
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  lastPage={totalPages}
                  total={totalItems}
                  itemName="auditorías"
                  onPageChange={loadAudits}
                  disabled={loading}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalles */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Auditoría</DialogTitle>
            <DialogDescription>
              Información completa de la acción registrada
            </DialogDescription>
          </DialogHeader>
          {selectedAudit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">ID</Label>
                  <p className="text-sm">{selectedAudit.id}</p>
                </div>
                <div>
                  <Label className="font-semibold">Fecha/Hora</Label>
                  <p className="text-sm">{formatDate(selectedAudit.created_at)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Usuario</Label>
                  <p className="text-sm">{getUserName(selectedAudit)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Descripción</Label>
                  <p className="text-sm">{selectedAudit.description}</p>
                </div>
                <div>
                  <Label className="font-semibold">Modelo</Label>
                  <p className="text-sm">{getSubjectName(selectedAudit)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Tipo de Entidad</Label>
                  <p className="text-sm">{getLogNameLabel(selectedAudit.log_name)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Evento</Label>
                  <div className="mt-1">
                    {getEventBadge(selectedAudit.event)}
                  </div>
                </div>
              </div>

              {selectedAudit.properties?.old && renderPropertiesList(
                selectedAudit.properties.old,
                'Valores Anteriores'
              )}

              {selectedAudit.properties?.new && renderPropertiesList(
                selectedAudit.properties.new,
                'Valores Nuevos'
              )}

              {selectedAudit.properties && (() => {
                // Filtrar campos técnicos y campos ya mostrados (old, new)
                const filteredProperties = { ...selectedAudit.properties };
                delete filteredProperties.ip_address;
                delete filteredProperties.user_agent;
                delete filteredProperties.url;
                delete filteredProperties.method;
                delete filteredProperties.old;
                delete filteredProperties.new;
                
                const visibleKeys = Object.keys(filteredProperties).filter(key => {
                  const value = filteredProperties[key];
                  return value !== null && value !== undefined && 
                         (typeof value !== 'object' || Object.keys(value).length > 0);
                });
                
                return visibleKeys.length > 0 ? renderPropertiesList(
                  filteredProperties,
                  'Información Adicional'
                ) : null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

