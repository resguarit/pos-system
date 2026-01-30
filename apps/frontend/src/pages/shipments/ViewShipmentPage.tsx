import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shipment } from '@/types/shipment';
import { shipmentService } from '@/services/shipmentService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Package, Calendar, Hash, User, MapPin, Building2, FileText, Phone, Mail, CreditCard, DollarSign, CheckCircle, XCircle, Clock, Receipt } from 'lucide-react';
import { PaymentShipmentDialog } from '@/components/shipments/PaymentShipmentDialog';
import { parseShippingCost } from '@/utils/shipmentUtils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const ViewShipmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const handlePaymentSuccess = () => {
    // Refetch shipment data to show updated payment status
    if (id) {
      shipmentService.getShipment(parseInt(id)).then(setShipment).catch(() => {
        toast.error('Error al actualizar datos del envío');
      });
    }
    setShowPaymentDialog(false);
  };

  useEffect(() => {
    const fetchShipment = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await shipmentService.getShipment(parseInt(id));
        setShipment(data);
      } catch (err) {
        setError('Error al cargar el envío');
        console.error('Error fetching shipment:', err);
        toast.error('Error al cargar el envío');
      } finally {
        setLoading(false);
      }
    };

    fetchShipment();
  }, [id]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Package className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Envío no encontrado</h2>
        <p className="text-muted-foreground">{error || 'El envío que buscas no existe'}</p>
        <Button onClick={() => navigate('/dashboard/envios')}>
          Volver a Envíos
        </Button>
      </div>
    );
  }

  const getClientInfo = () => {
    if (shipment.sales && shipment.sales.length > 0 && shipment.sales[0].customer) {
      const customer = shipment.sales[0].customer;
      return customer.person ? {
        name: [customer.person.first_name, customer.person.last_name].filter(Boolean).join(' '),
        phone: customer.person.phone || 'No disponible',
        address: customer.person.address || 'No disponible',
        dni: customer.person.documento || 'No disponible',
        email: customer.person.cuit || undefined
      } : null;
    }
    return null;
  };

  const clientInfo = getClientInfo();

  return (
    <div className="flex flex-col h-screen w-full p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard/envios')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detalles del Envío</h1>
            <p className="text-sm text-muted-foreground">
              Referencia: {shipment.reference || 'N/A'}
            </p>
          </div>
        </div>

        {shipment.current_stage && (
          <Badge
            style={{
              backgroundColor: `${shipment.current_stage.color}15`,
              borderColor: shipment.current_stage.color,
              color: shipment.current_stage.color
            }}
            className="text-base px-4 py-2"
          >
            {shipment.current_stage.name}
          </Badge>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente del Envío */}
          {clientInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Cliente del Envío
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-semibold text-lg">{clientInfo.name}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                      <p className="text-sm font-medium">{clientInfo.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Dirección</p>
                      <p className="text-sm font-medium">{clientInfo.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">DNI</p>
                      <p className="text-sm font-medium">{clientInfo.dni}</p>
                    </div>
                  </div>
                  {clientInfo.email && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-purple-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{clientInfo.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información de Envío */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información de Envío
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {shipment.shipping_address || 'No especificada'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ciudad</p>
                  <p className="text-sm font-medium">{shipment.shipping_city || 'No especificada'}</p>
                </div>
                {shipment.metadata?.shipping_state && (
                  <div>
                    <p className="text-sm text-muted-foreground">Provincia/Estado</p>
                    <p className="text-sm font-medium">{shipment.metadata.shipping_state}</p>
                  </div>
                )}
                {shipment.metadata?.shipping_postal_code && (
                  <div>
                    <p className="text-sm text-muted-foreground">Código Postal</p>
                    <p className="text-sm font-medium">{shipment.metadata.shipping_postal_code}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">País</p>
                  <p className="text-sm font-medium">{shipment.metadata?.shipping_country || 'Argentina'}</p>
                </div>
                {shipment.metadata?.estimated_delivery_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha Estimada de Entrega</p>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(shipment.metadata.estimated_delivery_date)}
                    </p>
                  </div>
                )}
              </div>
              {shipment.metadata?.transportista_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Transportista</p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {shipment.transporter?.person ? [shipment.transporter.person.first_name, shipment.transporter.person.last_name].filter(Boolean).join(' ') : 'N/A'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ventas Asociadas */}
          {shipment.sales && shipment.sales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Ventas Asociadas
                </CardTitle>
                <CardDescription>
                  {shipment.sales.length} venta{shipment.sales.length !== 1 ? 's' : ''} asociada{shipment.sales.length !== 1 ? 's' : ''} a este envío
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shipment.sales.map((sale) => (
                    <Card key={sale.id} className="border-2">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Venta #{sale.receipt_number}</CardTitle>
                          <Badge
                            variant={sale.payment_status === 'paid' ? 'default' : 'secondary'}
                            className={sale.payment_status === 'paid' ? 'bg-green-500' : ''}
                          >
                            {sale.payment_status === 'paid' ? 'Pagado' : sale.payment_status === 'partial' ? 'Parcial' : 'Pendiente'}
                          </Badge>
                        </div>
                        <CardDescription>
                          {new Date(sale.date).toLocaleDateString('es-AR')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Tipo de Comprobante</p>
                            <p className="text-sm font-medium">{sale.receipt_type?.description || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Cliente</p>
                            <p className="text-sm font-medium">
                              {sale.customer?.person ?
                                [sale.customer.person.first_name, sale.customer.person.last_name].filter(Boolean).join(' ') :
                                'Consumidor Final'
                              }
                            </p>
                          </div>
                        </div>
                        {sale.customer?.person && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sale.customer.person.phone && (
                              <div className="flex items-start gap-2">
                                <Phone className="h-4 w-4 text-green-600 mt-0.5" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Teléfono</p>
                                  <p className="text-sm font-medium">{sale.customer.person.phone}</p>
                                </div>
                              </div>
                            )}
                            {sale.customer.person.address && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Dirección</p>
                                  <p className="text-sm font-medium">{sale.customer.person.address}</p>
                                </div>
                              </div>
                            )}
                            {sale.customer.person.documento && (
                              <div className="flex items-start gap-2">
                                <CreditCard className="h-4 w-4 text-blue-600 mt-0.5" />
                                <div>
                                  <p className="text-sm text-muted-foreground">DNI</p>
                                  <p className="text-sm font-medium">{sale.customer.person.documento}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Productos de la venta */}
                        {sale.items && sale.items.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-3">Productos ({sale.items.length})</p>
                            <div className="border rounded-lg divide-y">
                              {sale.items.map((item) => (
                                <div key={item.id} className="p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium">{item.product?.name || 'Producto sin nombre'}</p>
                                      {item.product?.code && (
                                        <p className="text-xs text-muted-foreground">Código: {item.product.code}</p>
                                      )}
                                      <div className="flex gap-4 mt-2 text-sm">
                                        <span className="text-muted-foreground">Cantidad: {item.quantity}</span>
                                        <span className="text-muted-foreground">Precio unitario: {formatCurrency(item.unit_price)}</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold">{formatCurrency(item.item_total)}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.item_subtotal > 0 && (
                                          <>
                                            {formatCurrency(item.item_subtotal)} + IVA {formatCurrency(item.item_iva)}
                                          </>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Subtotal</p>
                            <p className="text-lg font-bold">{formatCurrency(typeof sale.subtotal === 'string' ? parseFloat(sale.subtotal) : sale.subtotal)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">IVA</p>
                            <p className="text-lg font-bold">{formatCurrency(typeof sale.total_iva_amount === 'string' ? parseFloat(sale.total_iva_amount) : (sale.total_iva_amount || 0))}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold">{formatCurrency(parseFloat(sale.total))}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">Pagado:</p>
                          <Badge variant="outline">{formatCurrency(typeof sale.paid_amount === 'string' ? parseFloat(sale.paid_amount) : sale.paid_amount)}</Badge>
                          <p className="text-sm text-muted-foreground">Pendiente:</p>
                          <Badge variant="secondary">{formatCurrency(sale.pending_amount || 0)}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notas */}
          {shipment.metadata?.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{shipment.metadata.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Side Info */}
        <div className="space-y-6">
          {/* Estado de Pago */}
          {shipment.shipping_cost && parseFloat(shipment.shipping_cost.toString()) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Costo de Envío
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="text-2xl font-bold">{formatCurrency(parseFloat(shipment.shipping_cost.toString()))}</p>
                </div>
                <div className="flex items-center gap-2">
                  {shipment.is_paid ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Pagado
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      Pendiente de Pago
                    </Badge>
                  )}
                </div>
                {!shipment.is_paid && hasPermission('registrar_pago_envio') && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Creado por</p>
                <p className="text-sm font-medium">
                  {shipment.creator?.person ?
                    [shipment.creator.person.first_name, shipment.creator.person.last_name].filter(Boolean).join(' ') :
                    shipment.creator?.email || 'N/A'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(shipment.created_at)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última Actualización</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatDate(shipment.updated_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && shipment && (
        <PaymentShipmentDialog
          shipmentId={shipment.id}
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          shippingCost={parseShippingCost(shipment.shipping_cost)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default ViewShipmentPage;
