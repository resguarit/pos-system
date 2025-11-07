import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';
import { shipmentService } from '@/services/shipmentService';
import { Shipment, ShipmentStage } from '@/types/shipment';
import { PaymentShipmentDialog } from './PaymentShipmentDialog';
import { useAuth } from '@/context/AuthContext';
import { parseShippingCost } from '@/utils/shipmentUtils';

interface EditShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: number | null;
  stages: ShipmentStage[];
  onSuccess: () => void;
}

interface EditShipmentForm {
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  priority: string;
  estimated_delivery_date: string;
  notes: string;
  shipping_cost: string;
  transportista_id?: number;
  cliente_id?: number;
  stage_id?: number;
}

export const EditShipmentDialog: React.FC<EditShipmentDialogProps> = ({
  open,
  onOpenChange,
  shipmentId,
  stages,
  onSuccess,
}) => {
  const { request } = useApi();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
  const [users, setUsers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Estados para búsqueda de transportista
  const [transporterSearch, setTransporterSearch] = useState('');
  const [showTransporterOptions, setShowTransporterOptions] = useState(false);
  
  // Estados para búsqueda de cliente  
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);

  const [editForm, setEditForm] = useState<EditShipmentForm>({
    shipping_address: '',
    shipping_city: '',
    shipping_state: '',
    shipping_postal_code: '',
    shipping_country: 'Argentina',
    priority: 'normal',
    estimated_delivery_date: '',
    notes: '',
    shipping_cost: '',
    transportista_id: undefined,
    cliente_id: undefined,
    stage_id: undefined,
  });

  // Cargar usuarios y clientes cuando se abre el dialog
  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchCustomers();
      if (shipmentId) {
        fetchShipmentData();
      }
    } else {
      // Limpiar búsquedas cuando se cierra
      setTransporterSearch('');
      setCustomerSearch('');
      setShowTransporterOptions(false);
      setShowCustomerOptions(false);
      setShowCancelConfirm(false);
    }
  }, [open, shipmentId]);

  const fetchShipmentData = async () => {
    if (!shipmentId) return;
    
    try {
      setLoadingData(true);
      
      const response = await shipmentService.getShipment(shipmentId);
      const shipmentData = response; // shipmentService.getShipment ya devuelve response.data?.data
      
      if (shipmentData) {
        setShipment(shipmentData);
        
        // Determinar cliente_id de las ventas asociadas
        const customerId = shipmentData.sales && shipmentData.sales.length > 0 
          ? shipmentData.sales[0].customer_id 
          : undefined;
        
        // Poblar el formulario
        setEditForm({
          shipping_address: shipmentData.shipping_address || '',
          shipping_city: shipmentData.shipping_city || '',
          shipping_state: shipmentData.shipping_state || '',
          shipping_postal_code: shipmentData.shipping_postal_code || '',
          shipping_country: shipmentData.shipping_country || 'Argentina',
          priority: shipmentData.priority || 'normal',
          estimated_delivery_date: shipmentData.estimated_delivery_date ? shipmentData.estimated_delivery_date.split('T')[0] : '',
          notes: shipmentData.notes || '',
          shipping_cost: shipmentData.shipping_cost ? shipmentData.shipping_cost.toString() : '',
          transportista_id: shipmentData.metadata?.transportista_id,
          cliente_id: customerId,
          stage_id: shipmentData.current_stage_id,
        });
        
        // Establecer búsquedas si existen
        // Esperamos un momento para que users y customers estén cargados
        setTimeout(() => {
          if (shipmentData.metadata?.transportista_id && users.length > 0) {
            const transporterUser = users.find(u => u.id === shipmentData.metadata.transportista_id);
            if (transporterUser && transporterUser.person) {
              const name = `${transporterUser.person.first_name} ${transporterUser.person.last_name}`;
              const email = transporterUser.email || '';
              setTransporterSearch(`${name} (${email})`);
            }
          }
          if (customerId && customers.length > 0) {
            const selectedCustomer = customers.find(c => c.id === customerId);
            if (selectedCustomer && selectedCustomer.person) {
              const name = `${selectedCustomer.person.first_name} ${selectedCustomer.person.last_name}`;
              const email = selectedCustomer.email || '';
              setCustomerSearch(`${name}${email ? ` (${email})` : ''}`);
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error fetching shipment:', error);
      toast.error('Error al cargar los datos del envío');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await request({ method: 'GET', url: '/users?include=person' });
      
      console.log('Users response:', response);
      
      if (response?.data) {
        const usersData = Array.isArray(response.data) ? response.data : response.data.data || [];
        console.log('Users data:', usersData);
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await request({ method: 'GET', url: '/customers' });
      
      console.log('Customers response:', response);
      
      if (response?.data) {
        const customersData = Array.isArray(response.data) ? response.data : response.data.data || [];
        console.log('Customers data:', customersData);
        setCustomers(customersData);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleUpdateShipment = async () => {
    if (!shipmentId) return;

    // TODO: Check permissions
    // if (!hasPermission('editar_envios')) {
    //   toast.error('No tienes permisos para editar envíos');
    //   return;
    // }

    try {
      setLoading(true);
      
      const metadata: any = {
        shipping_state: editForm.shipping_state || null,
        shipping_postal_code: editForm.shipping_postal_code || null,
        shipping_country: editForm.shipping_country || 'Argentina',
        priority: editForm.priority || 'normal',
        estimated_delivery_date: editForm.estimated_delivery_date || null,
        notes: editForm.notes || null,
      };

      if (editForm.transportista_id) {
        metadata.transportista_id = editForm.transportista_id;
      }
      if (editForm.cliente_id) {
        metadata.cliente_id = editForm.cliente_id;
      }

      const shipmentData = {
        shipping_address: editForm.shipping_address,
        shipping_city: editForm.shipping_city,
        shipping_state: editForm.shipping_state || undefined,
        shipping_postal_code: editForm.shipping_postal_code || undefined,
        shipping_country: editForm.shipping_country || undefined,
        priority: editForm.priority || undefined,
        estimated_delivery_date: editForm.estimated_delivery_date || undefined,
        notes: editForm.notes || undefined,
        shipping_cost: editForm.shipping_cost ? parseFloat(editForm.shipping_cost) : undefined,
        metadata: metadata,
        current_stage_id: editForm.stage_id,
        version: shipment?.version || 1,
      };

      await shipmentService.updateShipment(shipmentId, shipmentData);

      toast.success('Envío actualizado exitosamente');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Error updating shipment:', err);
      toast.error(err.response?.data?.message || 'Error al actualizar el envío');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelShipment = async () => {
    if (!shipmentId) return;

    if (!hasPermission('cancelar_envio')) {
      toast.error('No tienes permisos para cancelar envíos');
      return;
    }

    try {
      setLoading(true);
      
      await shipmentService.deleteShipment(shipmentId);

      toast.success('Envío cancelado exitosamente');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('Error cancelling shipment:', err);
      toast.error(err.response?.data?.message || 'Error al cancelar el envío');
    } finally {
      setLoading(false);
      setShowCancelConfirm(false);
    }
  };

  if (loadingData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* @ts-ignore */}
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* @ts-ignore */}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* @ts-ignore */}
        <DialogHeader>
          {/* @ts-ignore */}
          <DialogTitle>Editar Envío {shipment?.reference}</DialogTitle>
          {/* @ts-ignore */}
          <DialogDescription>
            Modifica los detalles del envío. Todos los campos son opcionales excepto la dirección y la ciudad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Etapa del envío */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado/Etapa *</label>
            <Select
              value={editForm.stage_id?.toString() || ''}
              onValueChange={(value) => setEditForm(prev => ({ ...prev, stage_id: parseInt(value) }))}
            >
              {/* @ts-ignore */}
              <SelectTrigger>
                {/* @ts-ignore */}
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              {/* @ts-ignore */}
              <SelectContent>
                {stages
                  .filter(stage => stage.is_active)
                  .sort((a, b) => a.order - b.order)
                  .map((stage) => (
                    // @ts-ignore
                    <SelectItem key={stage.id} value={stage.id.toString()}>
                      {stage.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridad */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Prioridad</label>
            <Select
              value={editForm.priority}
              onValueChange={(value) => setEditForm(prev => ({ ...prev, priority: value }))}
            >
              {/* @ts-ignore */}
              <SelectTrigger>
                {/* @ts-ignore */}
                <SelectValue placeholder="Seleccionar prioridad" />
              </SelectTrigger>
              {/* @ts-ignore */}
              <SelectContent>
                {/* @ts-ignore */}
                <SelectItem value="low">Baja</SelectItem>
                {/* @ts-ignore */}
                <SelectItem value="normal">Normal</SelectItem>
                {/* @ts-ignore */}
                <SelectItem value="high">Alta</SelectItem>
                {/* @ts-ignore */}
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transportista */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Transportista</label>
            <div className="relative">
              <Input
                value={transporterSearch}
                onChange={(e) => {
                  const v = e.target.value;
                  setTransporterSearch(v);
                  setShowTransporterOptions(!!v && v.length >= 1);
                  if (!v) {
                    setEditForm(prev => ({ ...prev, transportista_id: undefined }));
                  }
                }}
                onFocus={() => setShowTransporterOptions(transporterSearch.length >= 1)}
                onBlur={() => setTimeout(() => setShowTransporterOptions(false), 200)}
                placeholder="Buscar transportista..."
              />
              {showTransporterOptions && users.filter(user => {
                const searchLower = transporterSearch.toLowerCase();
                const firstName = user.person?.first_name || '';
                const lastName = user.person?.last_name || '';
                const email = user.email || '';
                const fullName = `${firstName} ${lastName}`.toLowerCase();
                return fullName.includes(searchLower) || email.toLowerCase().includes(searchLower);
              }).length > 0 && (
                <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                  {users.filter(user => {
                    const searchLower = transporterSearch.toLowerCase();
                    const firstName = user.person?.first_name || '';
                    const lastName = user.person?.last_name || '';
                    const email = user.email || '';
                    const fullName = `${firstName} ${lastName}`.toLowerCase();
                    return fullName.includes(searchLower) || email.toLowerCase().includes(searchLower);
                  }).map((user) => {
                    const firstName = user.person?.first_name || '';
                    const lastName = user.person?.last_name || '';
                    const email = user.email || '';
                    const name = firstName && lastName ? `${firstName} ${lastName}` : email || 'Usuario sin nombre';
                    
                    return (
                      <div
                        key={user.id}
                        className="p-2 cursor-pointer hover:bg-gray-100"
                        role="button"
                        tabIndex={0}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditForm(prev => ({ ...prev, transportista_id: user.id }));
                          setTransporterSearch(`${name} (${email})`);
                          setShowTransporterOptions(false);
                        }}
                      >
                        {name} ({email})
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Cliente</label>
            <div className="relative">
              <Input
                value={customerSearch}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomerSearch(v);
                  setShowCustomerOptions(!!v && v.length >= 1);
                  if (!v) {
                    setEditForm(prev => ({ ...prev, cliente_id: undefined }));
                  }
                }}
                onFocus={() => setShowCustomerOptions(customerSearch.length >= 1)}
                onBlur={() => setTimeout(() => setShowCustomerOptions(false), 200)}
                placeholder="Buscar cliente..."
              />
              {showCustomerOptions && customers.filter(customer => {
                const searchLower = customerSearch.toLowerCase();
                const firstName = customer.person?.first_name || '';
                const lastName = customer.person?.last_name || '';
                const email = customer.email || '';
                const fullName = `${firstName} ${lastName}`.toLowerCase();
                return fullName.includes(searchLower) || email.toLowerCase().includes(searchLower);
              }).length > 0 && (
                <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                  {customers.filter(customer => {
                    const searchLower = customerSearch.toLowerCase();
                    const firstName = customer.person?.first_name || '';
                    const lastName = customer.person?.last_name || '';
                    const email = customer.email || '';
                    const fullName = `${firstName} ${lastName}`.toLowerCase();
                    return fullName.includes(searchLower) || email.toLowerCase().includes(searchLower);
                  }).map((customer) => {
                    const firstName = customer.person?.first_name || '';
                    const lastName = customer.person?.last_name || '';
                    const email = customer.email || '';
                    const name = firstName && lastName ? `${firstName} ${lastName}` : email || 'Cliente sin nombre';
                    
                    return (
                      <div
                        key={customer.id}
                        className="p-2 cursor-pointer hover:bg-gray-100"
                        role="button"
                        tabIndex={0}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Rellenar los campos del formulario con los datos del cliente
                          setEditForm(prev => ({
                            ...prev,
                            cliente_id: customer.id,
                            shipping_address: customer.person?.address || prev.shipping_address,
                            shipping_city: customer.person?.city || prev.shipping_city,
                            shipping_state: customer.person?.state || prev.shipping_state,
                            shipping_postal_code: customer.person?.postal_code || prev.shipping_postal_code,
                          }));
                          
                          setCustomerSearch(`${name}${email ? ` (${email})` : ''}`);
                          setShowCustomerOptions(false);
                        }}
                      >
                        {name}{email ? ` (${email})` : ''}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Dirección *</label>
            <Input
              value={editForm.shipping_address}
              onChange={(e) => setEditForm(prev => ({ ...prev, shipping_address: e.target.value }))}
              placeholder="Calle y número"
              required
            />
          </div>

          {/* Provincia/Estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Provincia/Estado</label>
            <Input
              value={editForm.shipping_state}
              onChange={(e) => setEditForm(prev => ({ ...prev, shipping_state: e.target.value }))}
              placeholder="Provincia o estado"
            />
          </div>

          {/* Ciudad */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ciudad *</label>
            <Input
              value={editForm.shipping_city}
              onChange={(e) => setEditForm(prev => ({ ...prev, shipping_city: e.target.value }))}
              placeholder="Ciudad"
              required
            />
          </div>

          {/* Código Postal */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Código Postal</label>
            <Input
              value={editForm.shipping_postal_code}
              onChange={(e) => setEditForm(prev => ({ ...prev, shipping_postal_code: e.target.value }))}
              placeholder="CP"
            />
          </div>

          {/* País */}
          <div className="space-y-2">
            <label className="text-sm font-medium">País</label>
            <Input
              value={editForm.shipping_country}
              onChange={(e) => setEditForm(prev => ({ ...prev, shipping_country: e.target.value }))}
              placeholder="País"
            />
          </div>

          {/* Fecha Estimada de Entrega */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha Estimada de Entrega</label>
            <Input
              type="date"
              value={editForm.estimated_delivery_date}
              onChange={(e) => setEditForm(prev => ({ ...prev, estimated_delivery_date: e.target.value }))}
            />
          </div>

          {/* Costo de Envío */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Costo de Envío</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={editForm.shipping_cost}
              onChange={(e) => setEditForm(prev => ({ ...prev, shipping_cost: e.target.value }))}
              placeholder="0.00"
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notas</label>
            <Textarea
              value={editForm.notes}
              onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales..."
              rows={4}
            />
          </div>

          {/* Estado de Pago */}
          {shipment && shipment.shipping_cost && parseFloat(shipment.shipping_cost.toString()) > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <label className="text-sm font-medium">Estado de Pago</label>
              <div className="flex items-center gap-4">
                <Badge variant={shipment.is_paid ? 'default' : 'destructive'}>
                  {shipment.is_paid ? 'Pagado' : 'Pendiente'}
                </Badge>
                {!shipment.is_paid && hasPermission('registrar_pago_envio') && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    Registrar Pago
                  </Button>
                )}
              </div>
              {shipment.is_paid && shipment.payment_date && (
                <p className="text-sm text-muted-foreground">
                  Fecha de pago: {new Date(shipment.payment_date).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Cancelar Envío */}
          {shipment && hasPermission('cancelar_envio') && shipment.current_stage?.name !== 'Cancelado' && shipment.current_stage?.name !== 'Anulado' && !showCancelConfirm ? (
            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowCancelConfirm(true)}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar Envío
              </Button>
            </div>
          ) : shipment && hasPermission('cancelar_envio') && shipment.current_stage?.name !== 'Cancelado' && shipment.current_stage?.name !== 'Anulado' && (
            <div className="pt-4 border-t bg-red-50 p-4 rounded">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">¿Estás seguro?</h4>
                  <p className="text-sm text-red-700">Esta acción no se puede deshacer. El envío será marcado como cancelado.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1"
                >
                  No, volver
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancelShipment}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sí, cancelar envío
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cerrar
          </Button>
          {hasPermission('editar_envios') && (
            <Button
              type="button"
              onClick={handleUpdateShipment}
              disabled={loading || !editForm.shipping_address || !editForm.shipping_city}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Cambios
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Payment Dialog */}
      {shipment && (
        <PaymentShipmentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          shipmentId={shipmentId}
          shippingCost={parseShippingCost(shipment.shipping_cost)}
          onSuccess={() => {
            fetchShipmentData();
            onSuccess();
          }}
        />
      )}
    </Dialog>
  );
};

