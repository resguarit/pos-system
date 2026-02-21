import { useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Shipment, ShipmentStage } from '@/types/shipment';
import { Package, Eye, Edit, Printer, Download, MapPin, CreditCard, User, Clock, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { getStageBadgeStyle, getShipmentPaymentSummary } from '@/utils/shipmentUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ShipmentTableProps {
  shipments: Shipment[];
  stages: ShipmentStage[];
  onViewShipment: (shipmentId: number) => void;
  onEditShipment?: (shipmentId: number) => void;
  onPrintShipment?: (shipmentId: number) => void;
  onDownloadShipment?: (shipmentId: number) => void;
  loading?: boolean;
}

type DesktopColumnKey =
  | 'codigo'
  | 'entrega'
  | 'estado'
  | 'medios'
  | 'direccion'
  | 'cliente'
  | 'transportista'
  | 'acciones';

const initialDesktopColumnWidths: Record<DesktopColumnKey, number> = {
  codigo: 140,
  entrega: 160,
  estado: 140,
  medios: 220,
  direccion: 260,
  cliente: 170,
  transportista: 170,
  acciones: 140,
};

const minDesktopColumnWidths: Record<DesktopColumnKey, number> = {
  codigo: 110,
  entrega: 130,
  estado: 120,
  medios: 170,
  direccion: 200,
  cliente: 130,
  transportista: 130,
  acciones: 110,
};

const ShipmentTable: React.FC<ShipmentTableProps> = ({
  shipments,
  stages,
  onViewShipment,
  onEditShipment,
  onPrintShipment,
  onDownloadShipment,
  loading = false,
}) => {
  const { hasPermission } = useAuth();
  const [desktopColumnWidths, setDesktopColumnWidths] = useState<Record<DesktopColumnKey, number>>(initialDesktopColumnWidths);
  const desktopTableMinWidth = Object.values(desktopColumnWidths).reduce((total, width) => total + width, 0);

  const handleResizeStart = (column: DesktopColumnKey) => (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = desktopColumnWidths[column];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = Math.max(minDesktopColumnWidths[column], startWidth + deltaX);
      setDesktopColumnWidths((previous) => ({
        ...previous,
        [column]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const formatDeliveryDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      // Validar si la fecha es válida
      if (isNaN(date.getTime())) return '-';

      return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return '-';
    }
  };

  const getCustomerName = (shipment: Shipment) => {
    const customer = shipment.sales?.[0]?.customer;
    if (customer?.person) {
      return [customer.person.first_name, customer.person.last_name].filter(Boolean).join(' ').trim();
    }
    const businessName = (customer as { business_name?: string })?.business_name?.trim();
    return businessName || '-';
  };

  const getTransporterName = (shipment: Shipment) => {
    const transporter = shipment.transporter;
    if (!transporter) return '-';
    const name = transporter.person
      ? [transporter.person.first_name, transporter.person.last_name].filter(Boolean).join(' ').trim()
      : transporter.username;
    return name || '-';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-dashed">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No hay envíos disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile View (Cards) */}
      <div className="md:hidden space-y-2">
        {shipments.map((shipment) => {
          return (
            <Card key={shipment.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: shipment.current_stage?.color || '#cbd5e1' }}>
              <CardHeader className="p-2.5 bg-gray-50/50 pb-1.5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[15px] text-gray-900 leading-tight">
                      {shipment.tracking_number || shipment.reference || `#${shipment.id}`}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Est. {formatDeliveryDate(shipment.metadata?.estimated_delivery_date || shipment.estimated_delivery_date)}
                    </div>
                  </div>
                  <Badge
                    key={shipment.current_stage_id}
                    className="font-normal text-[10px] px-2 py-0.5"
                    style={getStageBadgeStyle(stages.find(s => s.id === shipment.current_stage_id))}
                    variant="outline"
                  >
                    {shipment.current_stage?.name || '-'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2.5 py-2 space-y-2">
                {/* Dirección - Destacada */}
                <div className="flex gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <div className="text-sm font-medium text-gray-900 leading-tight">
                    {shipment.shipping_address || 'Sin dirección'}
                    {shipment.shipping_city && <span className="text-gray-500 font-normal block text-[11px] leading-tight">{shipment.shipping_city}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <User className="w-2.5 h-2.5" /> Cliente
                    </div>
                    <div className="font-medium truncate text-sm leading-tight" title={getCustomerName(shipment)}>
                      {getCustomerName(shipment)}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Truck className="w-2.5 h-2.5" /> Transportista
                    </div>
                    <div className="font-medium truncate text-sm leading-tight" title={getTransporterName(shipment)}>
                      {getTransporterName(shipment)}
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 border-t space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-2.5 h-2.5 text-gray-400" />
                    <span className="text-[11px] font-medium text-gray-600">Medios de pago:</span>
                  </div>
                  {(() => {
                    const paymentSummary = getShipmentPaymentSummary(shipment);

                    if (paymentSummary.instructionsByMethod.length > 0) {
                      return (
                        <div className="space-y-0.5">
                          {paymentSummary.instructionsByMethod.map((instruction, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                              <span className="text-[11px] font-medium text-blue-900">{instruction.method}</span>
                              <span className="text-[11px] font-bold text-blue-700">{formatCurrency(instruction.amountCollected)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    return <span className="text-[11px] text-gray-500">Sin pagos registrados</span>;
                  })()}
                </div>
              </CardContent>
              <CardFooter className="p-2 bg-gray-50 flex justify-end gap-1">
                {hasPermission('ver_envios') && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onViewShipment(shipment.id)}>Ver</Button>
                )}
                {hasPermission('editar_envios') && onEditShipment && (
                  <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => onEditShipment(shipment.id)}>Editar</Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden md:block bg-white shadow-sm rounded-lg overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="divide-y divide-gray-200 table-fixed" style={{ minWidth: `${desktopTableMinWidth}px` }}>
            <colgroup>
              <col style={{ width: `${desktopColumnWidths.codigo}px` }} />
              <col style={{ width: `${desktopColumnWidths.entrega}px` }} />
              <col style={{ width: `${desktopColumnWidths.estado}px` }} />
              <col style={{ width: `${desktopColumnWidths.medios}px` }} />
              <col style={{ width: `${desktopColumnWidths.direccion}px` }} />
              <col style={{ width: `${desktopColumnWidths.cliente}px` }} />
              <col style={{ width: `${desktopColumnWidths.transportista}px` }} />
              <col style={{ width: `${desktopColumnWidths.acciones}px` }} />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="relative px-4 pr-8 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código<div onMouseDown={handleResizeStart('codigo')} className="absolute top-0 -right-1 z-20 h-full w-4 cursor-col-resize group" title="Redimensionar columna"><div className="mx-auto h-full w-px bg-gray-300 group-hover:bg-gray-500" /></div></th>
                <th className="relative px-4 pr-8 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrega Est.<div onMouseDown={handleResizeStart('entrega')} className="absolute top-0 -right-1 z-20 h-full w-4 cursor-col-resize group" title="Redimensionar columna"><div className="mx-auto h-full w-px bg-gray-300 group-hover:bg-gray-500" /></div></th>
                <th className="relative px-4 pr-8 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado<div onMouseDown={handleResizeStart('estado')} className="absolute top-0 -right-1 z-20 h-full w-4 cursor-col-resize group" title="Redimensionar columna"><div className="mx-auto h-full w-px bg-gray-300 group-hover:bg-gray-500" /></div></th>
                <th className="relative px-4 pr-8 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medios de pago<div onMouseDown={handleResizeStart('medios')} className="absolute top-0 -right-1 z-20 h-full w-4 cursor-col-resize group" title="Redimensionar columna"><div className="mx-auto h-full w-px bg-gray-300 group-hover:bg-gray-500" /></div></th>
                <th className="relative px-4 pr-8 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección<div onMouseDown={handleResizeStart('direccion')} className="absolute top-0 -right-1 z-20 h-full w-4 cursor-col-resize group" title="Redimensionar columna"><div className="mx-auto h-full w-px bg-gray-300 group-hover:bg-gray-500" /></div></th>
                <th className="relative px-4 pr-8 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente<div onMouseDown={handleResizeStart('cliente')} className="absolute top-0 -right-1 z-20 h-full w-4 cursor-col-resize group" title="Redimensionar columna"><div className="mx-auto h-full w-px bg-gray-300 group-hover:bg-gray-500" /></div></th>
                <th className="relative px-4 pr-8 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transportista<div onMouseDown={handleResizeStart('transportista')} className="absolute top-0 -right-1 z-20 h-full w-4 cursor-col-resize group" title="Redimensionar columna"><div className="mx-auto h-full w-px bg-gray-300 group-hover:bg-gray-500" /></div></th>
                <th className="relative px-4 pr-8 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones<div onMouseDown={handleResizeStart('acciones')} className="absolute top-0 -right-1 z-20 h-full w-4 cursor-col-resize group" title="Redimensionar columna"><div className="mx-auto h-full w-px bg-gray-300 group-hover:bg-gray-500" /></div></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shipments.map((shipment) => {


                return (
                  <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                    {/* Código */}
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {shipment.tracking_number || shipment.reference || `#${shipment.id}`}
                    </td>

                    {/* Entrega Estimada */}
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDeliveryDate(shipment.metadata?.estimated_delivery_date || shipment.estimated_delivery_date)}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        className="font-normal"
                        style={getStageBadgeStyle(stages.find(s => s.id === shipment.current_stage_id))}
                        variant="outline"
                      >
                        {shipment.current_stage?.name || 'Desc.'}
                      </Badge>
                    </td>

                    {/* Medios de pago */}
                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        const paymentSummary = getShipmentPaymentSummary(shipment);

                        if (paymentSummary.instructionsByMethod.length > 0) {
                          return (
                            <div className="space-y-1">
                              {paymentSummary.instructionsByMethod.map((instruction, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-1.5">
                                  <CreditCard className="h-3 w-3 text-blue-600" />
                                  <span className="text-xs font-medium text-blue-900">{instruction.method}</span>
                                  <span className="text-xs font-bold text-blue-700 ml-auto">{formatCurrency(instruction.amountCollected)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }

                        return <span className="text-xs text-gray-500">Sin pagos registrados</span>;
                      })()}
                    </td>

                    {/* Dirección */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="truncate max-w-[250px]" title={`${shipment.shipping_address}, ${shipment.shipping_city}`}>
                        {shipment.shipping_address || '-'}
                      </div>
                      {shipment.shipping_city && <div className="text-xs text-gray-500 truncate max-w-[250px]">{shipment.shipping_city}</div>}
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="truncate max-w-[140px]" title={getCustomerName(shipment)}>
                        {getCustomerName(shipment)}
                      </div>
                    </td>

                    {/* Transportista */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="truncate max-w-[140px]" title={getTransporterName(shipment)}>
                        {getTransporterName(shipment)}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="p-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onViewShipment(shipment.id)}
                                className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalles</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {onEditShipment && hasPermission('editar_envios') && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEditShipment(shipment.id)}
                                  className="h-8 w-8 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar envío</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {onPrintShipment && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onPrintShipment(shipment.id)}
                                  className="h-8 w-8 text-violet-600 hover:bg-violet-50 hover:text-violet-700"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Imprimir etiqueta</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {onDownloadShipment && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onDownloadShipment(shipment.id)}
                                  className="h-8 w-8 text-teal-600 hover:bg-teal-50 hover:text-teal-700"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Descargar comprobante</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShipmentTable;