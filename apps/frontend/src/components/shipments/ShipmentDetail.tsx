import { useState, useEffect, useMemo } from 'react';
import { Shipment, Sale } from '@/types/shipment';
import { shipmentService } from '@/services/shipmentService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Package, Calendar, Hash, User, MapPin, Building2, FileText, Phone, Mail, CreditCard, DollarSign, CheckCircle, XCircle, Clock, Wallet } from 'lucide-react';
import { PaymentShipmentDialog } from './PaymentShipmentDialog';
import { parseShippingCost, getShipmentPaymentSummary } from '@/utils/shipmentUtils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface ShipmentDetailProps {
  shipmentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShipmentDetail: React.FC<ShipmentDetailProps> = ({ shipmentId, open, onOpenChange }) => {
  const { hasPermission } = useAuth();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const handlePaymentSuccess = () => {
    // Refetch shipment data to show updated payment status
    if (shipmentId) {
      shipmentService.getShipment(shipmentId).then(setShipment).catch(() => {
        toast.error('Error al actualizar datos del envío');
      });
    }
    setShowPaymentDialog(false);
  };

  useEffect(() => {
    const fetchShipment = async () => {
      if (!shipmentId) return;
      try {
        setLoading(true);
        const data = await shipmentService.getShipment(shipmentId);
        setShipment(data);
      } catch (err) {
        setError('Error al cargar el envío');
        console.error('Error fetching shipment:', err);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchShipment();
    }
  }, [shipmentId, open]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  type SalePaymentLike = {
    id: number;
    amount: number | string;
    payment_method?: {
      id: number;
      name: string;
    };
  };

  const getSalePayments = (sale: Sale): SalePaymentLike[] => {
    if (Array.isArray(sale.payments) && sale.payments.length > 0) {
      return sale.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        payment_method: payment.payment_method,
      }));
    }

    if (Array.isArray(sale.sale_payments) && sale.sale_payments.length > 0) {
      return sale.sale_payments;
    }

    return [];
  };

  // Calcular resumen de pagos
  const paymentSummary = useMemo(() => {
    if (!shipment) return null;
    return getShipmentPaymentSummary(shipment);
  }, [shipment]);

  if (error || !shipment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error al cargar el envío</DialogTitle>
            <DialogDescription>
              {error || 'Envío no encontrado'}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalle del Envío: {shipment.tracking_number || shipment.reference || `#${shipment.id}`}
          </DialogTitle>
          <DialogDescription>
            Información completa del envío y sus ventas asociadas
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Shipment Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Hash className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Referencia</p>
                    <p className="text-base font-semibold">{shipment.tracking_number || shipment.reference || `#${shipment.id}`}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado Actual</p>
                    <Badge variant="outline" className="mt-1">
                      {shipment.current_stage?.name || 'Desconocido'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de creación</p>
                    <p className="text-base">{formatDate(shipment.created_at)}</p>
                  </div>
                </div>
                {/* Costo de Envío */}
                {shipment.shipping_cost && parseFloat(shipment.shipping_cost.toString()) > 0 && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Costo de Envío</p>
                      <p className="text-base font-semibold">{formatCurrency(parseFloat(shipment.shipping_cost.toString()))}</p>
                    </div>
                  </div>
                )}
                {/* Estado de Pago */}
                {shipment.shipping_cost && parseFloat(shipment.shipping_cost.toString()) > 0 && (
                  <div className="flex items-start gap-3">
                    {shipment.is_paid ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Estado de Pago</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className={shipment.is_paid ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-orange-100 text-orange-800 hover:bg-orange-100'}>
                          {shipment.is_paid ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Pagado
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Pendiente
                            </>
                          )}
                        </Badge>
                        {!shipment.is_paid && hasPermission('registrar_pago_envio') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowPaymentDialog(true)}
                            className="h-7"
                          >
                            Registrar Pago
                          </Button>
                        )}
                      </div>
                      {shipment.is_paid && shipment.payment_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Fecha: {formatDate(shipment.payment_date)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Creado por</p>
                    <p className="text-base">{shipment.creator?.username || shipment.creator?.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant={shipment.priority === 'urgent' ? 'destructive' : shipment.priority === 'high' ? 'secondary' : 'outline'} className="mt-1">
                    Prioridad: {shipment.priority === 'low' ? 'Baja' : shipment.priority === 'normal' ? 'Normal' : shipment.priority === 'high' ? 'Alta' : 'Urgente'}
                  </Badge>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Última actualización</p>
                    <p className="text-base">{formatDate(shipment.updated_at)}</p>
                  </div>
                </div>

                {/* Fecha Estimada de Entrega */}
                {shipment.estimated_delivery_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Fecha Estimada de Entrega</p>
                      <p className="text-base font-medium text-blue-700">{formatDate(shipment.estimated_delivery_date)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Information */}
            {shipment.shipping_address && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Dirección de Envío
                  </h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Dirección</p>
                        <p className="text-base">{shipment.shipping_address}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Provincia/Estado</p>
                        <p className="text-base">{shipment.shipping_state || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Código Postal</p>
                        <p className="text-base">{shipment.shipping_postal_code || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">País</p>
                        <p className="text-base">{shipment.shipping_country || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Transportista y Cliente */}
            {(() => {
              // Obtener el transportista
              const transporter = shipment.transporter;

              // Obtener el cliente de las ventas asociadas
              const clientCustomer = shipment.sales && shipment.sales.length > 0
                ? shipment.sales[0].customer
                : null;

              if (!transporter && !clientCustomer) {
                return null;
              }

              return (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Información de Contacto
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {transporter && (
                        <div className="border rounded-lg p-4">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Transportista</p>
                          <p className="text-base font-medium mb-2">
                            {transporter.person?.first_name || ''} {transporter.person?.last_name || ''}
                          </p>
                          {transporter.email && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3 text-blue-600" />
                              {transporter.email}
                            </p>
                          )}
                          {transporter.person?.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 text-green-600" />
                              {transporter.person.phone}
                            </p>
                          )}
                        </div>
                      )}
                      {clientCustomer && (clientCustomer.person || (clientCustomer as { business_name?: string })?.business_name) && (
                        <div className="border rounded-lg p-4">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Cliente del Envío</p>
                          <p className="text-base font-medium mb-2">
                            {(() => {
                              if (clientCustomer.person) {
                                const name = [clientCustomer.person.first_name, clientCustomer.person.last_name].filter(Boolean).join(' ').trim();
                                if (name) return name;
                              }
                              return (clientCustomer as { business_name?: string })?.business_name?.trim() || 'Sin nombre';
                            })()}
                          </p>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {(clientCustomer.person as any)?.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 text-green-600" />
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {(clientCustomer.person as any).phone}
                            </p>
                          )}
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {(clientCustomer.person as any)?.address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-red-600" />
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {(clientCustomer.person as any).address}
                            </p>
                          )}
                          {clientCustomer.person?.documento && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <CreditCard className="h-3 w-3 text-purple-600" />
                              DNI: {clientCustomer.person.documento}
                            </p>
                          )}
                          {clientCustomer.email && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3 text-blue-600" />
                              {clientCustomer.email}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Notes */}
            {shipment.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notas
                  </h3>
                  <p className="text-base whitespace-pre-wrap">{shipment.notes}</p>
                </div>
              </>
            )}

            {/* Resumen de métodos de pago agrupado */}
            {paymentSummary && paymentSummary.salesInfo.length > 0 && (
              <>
                <Separator />
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-600 rounded-full p-3">
                      <Wallet className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-blue-900">Medios de Pago del Envío</h3>
                      <p className="text-sm text-blue-700">Totales agrupados sobre todas las ventas</p>
                    </div>
                  </div>

                  {/* Panel principal */}
                  <div className="rounded-xl p-6 mb-6 bg-gradient-to-br from-slate-700 to-slate-800 text-white">
                    <p className="text-sm font-semibold uppercase tracking-wide opacity-90 mb-1">Total Pagado Registrado</p>
                    <p className="text-4xl font-black">{formatCurrency(paymentSummary.paidAmount)}</p>
                  </div>

                  {/* Métodos de pago agrupados */}
                  {paymentSummary.instructionsByMethod.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Totales por Método de Pago
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {paymentSummary.instructionsByMethod.map((instruction, idx) => (
                          <div 
                            key={idx}
                            className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-md hover:shadow-lg transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="bg-blue-100 rounded-full p-2">
                                  <CreditCard className="h-5 w-5 text-blue-600" />
                                </div>
                                <span className="font-bold text-gray-900">{instruction.method}</span>
                              </div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 mt-2">
                              <p className="text-xs text-blue-700 font-medium mb-1">Total</p>
                              <p className="text-3xl font-black text-blue-900">
                                {formatCurrency(instruction.amountCollected)}
                              </p>
                            </div>
                            {/* Detalle de ventas para este método */}
                            {instruction.sales.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-600 mb-2">Desglose:</p>
                                {instruction.sales.map((sale, saleIdx) => (
                                  <div key={saleIdx} className="flex justify-between items-center text-xs py-1">
                                    <span className="text-gray-700">Venta #{sale.receiptNumber}</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(sale.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {paymentSummary.instructionsByMethod.length === 0 && (
                    <div className="bg-white border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                      Sin métodos de pago registrados en las ventas de este envío.
                    </div>
                  )}

                  {/* Resumen totales */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-600 mb-1">Total Ventas</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(paymentSummary.totalAmount)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm text-gray-600 mb-1">Pendiente</p>
                      <p className="text-xl font-bold text-orange-600">{formatCurrency(paymentSummary.pendingAmount)}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Sales Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ventas Asociadas
              </h3>
              {shipment.sales && shipment.sales.length > 0 ? (
                <div className="space-y-3">
                  {shipment.sales.map((sale) => (
                    <div key={sale.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="font-medium">Venta #{sale.receipt_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(sale.date).toLocaleDateString('es-AR')}
                          </div>
                          {(() => {
                            const customer = sale.customer;
                            const person = customer?.person;

                            const displayName = person
                              ? [person.first_name, person.last_name].filter(Boolean).join(' ').trim() || (customer as { business_name?: string })?.business_name?.trim()
                              : (customer as { business_name?: string })?.business_name?.trim() ||
                                (customer?.first_name != null || customer?.last_name != null
                                  ? [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim()
                                  : null);

                            if (person || displayName) {
                              return (
                                <div className="space-y-1">
                                  <div className="text-sm font-medium">
                                    Cliente: {displayName || 'Sin nombre'}
                                  </div>
                                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                  {(person as any).phone && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Phone className="h-3 w-3 text-green-600" />
                                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                      {(person as any).phone}
                                    </div>
                                  )}
                                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                  {(person as any).address && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-red-600" />
                                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                      {(person as any).address}
                                    </div>
                                  )}
                                  {person?.documento && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <CreditCard className="h-3 w-3 text-purple-600" />
                                      DNI: {person?.documento}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {sale.receipt_type && (
                            <div className="text-sm text-muted-foreground">
                              Tipo: {sale.receipt_type.name}
                            </div>
                          )}
                          
                          {/* Métodos de Pago de esta venta */}
                          {getSalePayments(sale).length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                Métodos de Pago:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {getSalePayments(sale).map((payment: SalePaymentLike, idx: number) => (
                                  <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                                    <CreditCard className="h-3 w-3 text-blue-600" />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium text-blue-900">
                                        {payment.payment_method?.name || 'Sin método'}
                                      </span>
                                      <span className="text-xs font-bold text-blue-700">
                                        {formatCurrency(typeof payment.amount === 'number' ? payment.amount : parseFloat(payment.amount?.toString() || '0'))}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Información de pagado/pendiente */}
                          {(typeof sale.paid_amount !== 'undefined' || typeof sale.pending_amount !== 'undefined') && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {typeof sale.paid_amount !== 'undefined' && parseFloat(sale.paid_amount.toString()) > 0 && (
                                  <div className="bg-green-50 rounded p-2">
                                    <p className="text-green-700 font-medium">Pagado</p>
                                    <p className="text-sm font-bold text-green-900">
                                      {formatCurrency(typeof sale.paid_amount === 'number' ? sale.paid_amount : parseFloat(sale.paid_amount?.toString() || '0'))}
                                    </p>
                                  </div>
                                )}
                                {typeof sale.pending_amount !== 'undefined' && parseFloat(sale.pending_amount.toString()) > 0 && (
                                  <div className="bg-orange-50 rounded p-2 border border-orange-300">
                                    <p className="text-orange-700 font-medium">Pendiente</p>
                                    <p className="text-sm font-bold text-orange-900">
                                      {formatCurrency(Number(sale.pending_amount ?? 0))}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right space-y-2">
                          <div className="font-semibold text-lg">
                            {formatCurrency(sale.total)}
                          </div>
                          {sale.payment_status && (
                            <Badge className={
                              sale.payment_status === 'paid'
                                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                : sale.payment_status === 'partial'
                                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                                  : 'bg-red-100 text-red-800 hover:bg-red-100'
                            }>
                              {sale.payment_status === 'paid' ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Pagado
                                </>
                              ) : sale.payment_status === 'partial' ? (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pago Parcial
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Pendiente
                                </>
                              )}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay ventas asociadas</p>
                </div>
              )}
            </div>

            {/* Events History */}
            {shipment.events && shipment.events.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Historial de Eventos
                  </h3>
                  <div className="space-y-3">
                    {shipment.events.map((event) => (
                      <div key={event.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {event.from_stage && event.to_stage
                                ? `Movido de "${event.from_stage.name}" a "${event.to_stage.name}"`
                                : event.from_stage
                                  ? `Creado en "${event.from_stage.name}"`
                                  : 'Evento del sistema'}
                            </div>
                            {event.user && (
                              <div className="text-sm text-muted-foreground">
                                Por: {event.user.full_name || event.user.username}
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground">
                              {formatDate(event.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>

      {/* Payment Dialog */}
      {shipment && shipment.shipping_cost && parseFloat(shipment.shipping_cost.toString()) > 0 && !shipment.is_paid && (
        <PaymentShipmentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          shipmentId={shipmentId}
          shippingCost={parseShippingCost(shipment.shipping_cost)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </Dialog>
  );
};

export default ShipmentDetail;
