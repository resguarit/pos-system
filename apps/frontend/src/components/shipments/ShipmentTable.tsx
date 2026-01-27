import { useState, useRef, useCallback } from 'react';
import { Shipment, ShipmentStage } from '@/types/shipment';
import { Package, Truck, CheckCircle, Clock, Eye, ChevronUp, ChevronDown, Edit, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BranchBadge } from '@/components/BranchBadge';
import { getBranchColor } from '@/utils/branchColor';
import { useAuth } from '@/context/AuthContext';

interface ShipmentTableProps {
  shipments: Shipment[];
  stages: ShipmentStage[];
  onViewShipment: (shipmentId: number) => void;
  onEditShipment?: (shipmentId: number) => void;
  onPrintShipment?: (shipmentId: number) => void;
  onDownloadShipment?: (shipmentId: number) => void;
  loading?: boolean;
  showBranchColumn?: boolean;
  getBranchInfo?: (branchId: number) => { color?: string; description?: string } | undefined;
}

type SortField = 'priority' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface ColumnWidths {
  reference: number;
  branch: number;
  priority: number;
  status: number;
  paymentStatus: number;
  address: number;
  customer: number;
  transporter: number;
  sales: number;
  updated: number;
  created: number;
  actions: number;
}

const ShipmentTable: React.FC<ShipmentTableProps> = ({
  shipments,
  stages,
  onViewShipment,
  onEditShipment,
  onPrintShipment,
  onDownloadShipment,
  loading = false,
  showBranchColumn = false,
  getBranchInfo,
}) => {
  const { hasPermission } = useAuth();
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    reference: 150,
    branch: 120,
    priority: 120,
    status: 150,
    paymentStatus: 120,
    address: 180,
    customer: 150,
    transporter: 140,
    sales: 100,
    updated: 140,
    created: 140,
    actions: 200,
  });

  const resizingColumn = useRef<keyof ColumnWidths | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const getStageColor = useCallback((stageId: number): string => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return 'bg-gray-100 text-gray-700';

    switch (stage.order) {
      case 1: return 'bg-yellow-100 text-yellow-700';
      case 2: return 'bg-blue-100 text-blue-700';
      case 3: return 'bg-purple-100 text-purple-700';
      case 4: return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }, [stages]);

  const getStageIcon = useCallback((stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return Package;

    switch (stage.order) {
      case 1: return Clock;
      case 2: return Package;
      case 3: return Truck;
      case 4: return CheckCircle;
      default: return Package;
    }
  }, [stages]);

  const getPriorityColor = useCallback((priority: string = 'normal'): string => {
    switch (priority.toLowerCase()) {
      case 'low': return 'bg-gray-100 text-gray-700';
      case 'normal': return 'bg-blue-100 text-blue-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'urgent': return 'bg-red-100 text-red-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  }, []);

  const getPriorityLabel = useCallback((priority: string = 'normal'): string => {
    switch (priority.toLowerCase()) {
      case 'low': return 'Baja';
      case 'normal': return 'Normal';
      case 'high': return 'Alta';
      case 'urgent': return 'Urgente';
      default: return 'Normal';
    }
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection]);

  const sortedShipments = [...shipments].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case 'priority': {
        const priorityOrder: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
        aValue = priorityOrder[a.priority?.toLowerCase() || 'normal'] || 2;
        bValue = priorityOrder[b.priority?.toLowerCase() || 'normal'] || 2;
        break;
      }
      case 'status':
        aValue = a.current_stage?.name || '';
        bValue = b.current_stage?.name || '';
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleMouseDown = useCallback((column: keyof ColumnWidths, e: React.MouseEvent) => {
    e.preventDefault();
    resizingColumn.current = column;
    startX.current = e.pageX;
    startWidth.current = columnWidths[column];

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumn.current) {
        const diff = e.pageX - startX.current;
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn.current!]: Math.max(80, startWidth.current + diff),
        }));
      }
    };

    const handleMouseUp = () => {
      resizingColumn.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  const renderSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline-block ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline-block ml-1" />
    );
  }, [sortField, sortDirection]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead className="bg-gray-50">
            <tr>
              {/* Referencia */}
              <th
                style={{ width: columnWidths.reference }}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none"
              >
                Referencia
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown('reference', e)}
                />
              </th>

              {/* Sucursal - Solo mostrar si showBranchColumn es true */}
              {showBranchColumn && (
                <th
                  style={{ width: columnWidths.branch }}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none"
                >
                  Sucursal
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown('branch', e)}
                  />
                </th>
              )}

              {/* Prioridad */}
              <th
                style={{ width: columnWidths.priority }}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('priority')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('priority')}
                aria-label="Ordenar por prioridad"
              >
                Prioridad
                {renderSortIcon('priority')}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown('priority', e)}
                />
              </th>

              {/* Estado */}
              <th
                style={{ width: columnWidths.status }}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('status')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('status')}
                aria-label="Ordenar por estado"
              >
                Estado
                {renderSortIcon('status')}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown('status', e)}
                />
              </th>

              {/* Estado de Pago */}
              <th
                style={{ width: columnWidths.paymentStatus }}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none"
              >
                Estado Pago
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown('paymentStatus', e)}
                />
              </th>

              {/* Dirección */}
              <th
                style={{ width: columnWidths.address }}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none"
              >
                Dirección
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown('address', e)}
                />
              </th>

              {/* Cliente */}
              <th
                style={{ width: columnWidths.customer }}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none"
              >
                Cliente
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown('customer', e)}
                />
              </th>

              {/* Transportista */}
              <th
                style={{ width: columnWidths.transporter }}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none"
              >
                Transportista
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown('transporter', e)}
                />
              </th>

              {/* Pedidos */}
              <th
                style={{ width: columnWidths.sales }}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none"
              >
                Pedidos
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown('sales', e)}
                />
              </th>

              {/* Creado */}
              <th
                style={{ width: columnWidths.created }}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('created_at')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSort('created_at')}
                aria-label="Ordenar por fecha de creación"
              >
                Creado
                {renderSortIcon('created_at')}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown('created', e)}
                />
              </th>

              {/* Actualizado */}
              <th
                style={{ width: columnWidths.updated }}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none"
              >
                Actualizado
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  onMouseDown={(e) => handleMouseDown('updated', e)}
                />
              </th>

              {/* Acciones */}
              <th
                style={{ width: columnWidths.actions }}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative select-none"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedShipments.map((shipment) => (
              <tr key={shipment.id} className="hover:bg-gray-50">
                {/* Referencia */}
                <td className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis">
                  <div className="text-sm font-medium text-gray-900">
                    {shipment.tracking_number || shipment.reference || `#${shipment.id}`}
                  </div>
                </td>

                {/* Sucursal - Solo mostrar si showBranchColumn es true */}
                {showBranchColumn && shipment.branch_id && (
                  <td className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis">
                    {(() => {
                      const branchInfo = getBranchInfo?.(shipment.branch_id);
                      const branchColor = getBranchColor({ branchColor: branchInfo?.color });
                      const branchName = branchInfo?.description ?? `Sucursal ${shipment.branch_id}`;

                      return (
                        <BranchBadge
                          name={branchName}
                          color={branchColor}
                        />
                      );
                    })()}
                  </td>
                )}

                {/* Prioridad */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(shipment.priority)}`}>
                      {getPriorityLabel(shipment.priority)}
                    </span>
                  </div>
                </td>

                {/* Estado */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(shipment.current_stage_id)}`}>
                      {
                        (() => {
                          const IconComponent = getStageIcon(shipment.current_stage_id);
                          return <IconComponent className="w-3 h-3 mr-1" />;
                        })()
                      }
                      {shipment.current_stage?.name || stages.find(s => s.id === shipment.current_stage_id)?.name || 'Desconocido'}
                    </span>
                  </div>
                </td>

                {/* Estado de Pago */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {shipment.shipping_cost && parseFloat(shipment.shipping_cost.toString()) > 0 ? (
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shipment.is_paid
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                        {shipment.is_paid ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>

                {/* Dirección */}
                <td className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis" title={shipment.shipping_address}>
                  <div className="text-sm text-gray-900 max-w-[200px] truncate">
                    {shipment.shipping_address || '-'}
                  </div>
                </td>

                {/* Cliente */}
                <td className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis">
                  <div className="text-sm text-gray-900 max-w-[150px] truncate">
                    {(() => {
                      const customer = shipment.sales?.[0]?.customer;
                      if (customer?.person) {
                        return `${customer.person.first_name} ${customer.person.last_name}`;
                      }
                      if (customer?.first_name && customer?.last_name) {
                        return `${customer.first_name} ${customer.last_name}`;
                      }
                      return '-';
                    })()}
                  </div>
                </td>

                {/* Transportista */}
                <td className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis">
                  <div className="text-sm text-gray-900 max-w-[150px] truncate">
                    {(() => {
                      const transporter = shipment.transporter;
                      if (!transporter) return '-';

                      const firstName = transporter.person?.first_name || '';
                      const lastName = transporter.person?.last_name || '';

                      if (firstName || lastName) {
                        return `${firstName} ${lastName}`.trim();
                      }

                      return transporter.username || `ID: ${shipment.metadata?.transportista_id}`;
                    })()}
                  </div>
                </td>

                {/* Ventas/Pedidos */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {shipment.sales && shipment.sales.length > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {shipment.sales.length} pedido{shipment.sales.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Sin pedidos</span>
                    )}
                  </div>
                </td>

                {/* Creado */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(shipment.created_at).toLocaleDateString()}
                  </div>
                </td>

                {/* Actualizado */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(shipment.updated_at).toLocaleDateString()}
                  </div>
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-1">
                    {hasPermission('ver_envios') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewShipment(shipment.id)}
                        className="h-8 w-8 p-0"
                        aria-label={`Ver envío ${shipment.tracking_number || shipment.reference || shipment.id}`}
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}

                    {hasPermission('editar_envios') && onEditShipment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditShipment(shipment.id)}
                        className="h-8 w-8 p-0"
                        aria-label="Editar"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4 text-orange-600" />
                      </Button>
                    )}

                    {(hasPermission('imprimir_etiqueta_envio') || hasPermission('ver_envios')) && onDownloadShipment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownloadShipment(shipment.id)}
                        className="h-8 w-8 p-0"
                        aria-label="Descargar etiqueta PDF"
                        title="Descargar Etiqueta PDF"
                      >
                        <Download className="h-4 w-4 text-green-600" />
                      </Button>
                    )}

                    {(hasPermission('imprimir_etiqueta_envio') || hasPermission('ver_envios')) && onPrintShipment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPrintShipment(shipment.id)}
                        className="h-8 w-8 p-0"
                        aria-label="Imprimir etiqueta"
                        title="Imprimir Etiqueta"
                      >
                        <Printer className="h-4 w-4 text-purple-600" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shipments.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay envíos disponibles</p>
        </div>
      )}
    </div>
  );
};

export default ShipmentTable;