import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';
import { useSales } from '@/hooks/useSales';
import { shipmentService } from '@/services/shipmentService';
import { ShipmentStage } from '@/types/shipment';
import { useBranch } from '@/context/BranchContext';

interface NewShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: ShipmentStage[];
  onSuccess: () => void;
}

interface NewShipmentForm {
  sale_ids: number[];
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
  branch_id?: number;
}

export const NewShipmentDialog: React.FC<NewShipmentDialogProps> = ({
  open,
  onOpenChange,
  stages,
  onSuccess,
}) => {
  const { request } = useApi();
  const { sales: availableSales, isLoading: loadingSales, refetch: refetchSales } = useSales({ limit: 100 });
  const { selectedBranchIds, branches } = useBranch();

  const [newShipmentForm, setNewShipmentForm] = useState<NewShipmentForm>({
    sale_ids: [],
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
    branch_id: undefined,
  });

  const [searchSaleTerm, setSearchSaleTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para búsqueda de transportista
  const [transporterSearch, setTransporterSearch] = useState('');
  const [showTransporterOptions, setShowTransporterOptions] = useState(false);
  
  // Estados para búsqueda de cliente  
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);

  // Cargar usuarios y clientes cuando se abre el dialog
  useEffect(() => {
    if (open) {
      refetchSales();
      fetchUsers();
      fetchCustomers();
      
      // Establecer el estado inicial por defecto
      const initialStage = stages.find(s => s.order === 1);
      if (initialStage) {
        setNewShipmentForm(prev => ({ ...prev, stage_id: initialStage.id }));
      }
    } else {
      // Limpiar búsquedas cuando se cierra
      setTransporterSearch('');
      setCustomerSearch('');
      setSearchSaleTerm('');
      setShowTransporterOptions(false);
      setShowCustomerOptions(false);
    }
  }, [open]);

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
  
  // Filtrar transportistas según búsqueda
  useEffect(() => {
    if (!transporterSearch.trim()) {
      return;
    }
    
    const searchLower = transporterSearch.toLowerCase();
    const filtered = users.filter(user => {
      const firstName = user.person?.first_name || '';
      const lastName = user.person?.last_name || '';
      const email = user.email || '';
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      
      return fullName.includes(searchLower) || email.toLowerCase().includes(searchLower);
    });
    
    setShowTransporterOptions(filtered.length > 0);
  }, [transporterSearch, users]);
  
  // Filtrar clientes según búsqueda
  useEffect(() => {
    if (!customerSearch.trim()) {
      return;
    }
    
    const searchLower = customerSearch.toLowerCase();
    const filtered = customers.filter(customer => {
      const firstName = customer.person?.first_name || '';
      const lastName = customer.person?.last_name || '';
      const email = customer.email || '';
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      
      return fullName.includes(searchLower) || email.toLowerCase().includes(searchLower);
    });
    
    setShowCustomerOptions(filtered.length > 0);
  }, [customerSearch, customers]);

  const handleSaleToggle = (saleId: number) => {
    setNewShipmentForm(prev => ({
      ...prev,
      sale_ids: prev.sale_ids.includes(saleId)
        ? prev.sale_ids.filter(id => id !== saleId)
        : [...prev.sale_ids, saleId]
    }));
  };

  const handleCreateShipment = async () => {
    if (newShipmentForm.sale_ids.length === 0) {
      toast.error('Selecciona al menos una venta');
      return;
    }

    try {
      setLoading(true);
      
      // Preparar metadata con datos opcionales
      const metadata: any = {
        shipping_state: newShipmentForm.shipping_state || null,
        shipping_postal_code: newShipmentForm.shipping_postal_code || null,
        shipping_country: newShipmentForm.shipping_country || 'Argentina',
        priority: newShipmentForm.priority || 'normal',
        estimated_delivery_date: newShipmentForm.estimated_delivery_date || null,
        notes: newShipmentForm.notes || null,
      };

      // Agregar IDs si existen
      if (newShipmentForm.transportista_id) {
        metadata.transportista_id = newShipmentForm.transportista_id;
      }
      if (newShipmentForm.cliente_id) {
        metadata.cliente_id = newShipmentForm.cliente_id;
      }

      // Validar que se haya seleccionado una sucursal si hay múltiples
      if (selectedBranchIds.length > 1 && !newShipmentForm.branch_id) {
        toast.error('Debes seleccionar una sucursal');
        return;
      }

      // Si solo hay una sucursal seleccionada, usar su ID
      const branchId = selectedBranchIds.length === 1 
        ? parseInt(selectedBranchIds[0], 10)
        : newShipmentForm.branch_id;

      const shipmentData = {
        sale_ids: newShipmentForm.sale_ids,
        shipping_address: newShipmentForm.shipping_address,
        shipping_city: newShipmentForm.shipping_city,
        shipping_state: newShipmentForm.shipping_state || undefined,
        shipping_postal_code: newShipmentForm.shipping_postal_code || undefined,
        shipping_country: newShipmentForm.shipping_country || undefined,
        priority: newShipmentForm.priority || undefined,
        estimated_delivery_date: newShipmentForm.estimated_delivery_date || undefined,
        notes: newShipmentForm.notes || undefined,
        shipping_cost: newShipmentForm.shipping_cost ? parseFloat(newShipmentForm.shipping_cost) : undefined,
        branch_id: branchId,
        metadata: metadata,
      };

      await shipmentService.createShipment(shipmentData);

      toast.success('Envío creado exitosamente');
      onOpenChange(false);
      
      // Limpiar formulario
      setNewShipmentForm({
        sale_ids: [],
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
      
      // Limpiar búsquedas
      setSearchSaleTerm('');
      setTransporterSearch('');
      setCustomerSearch('');
      setShowTransporterOptions(false);
      setShowCustomerOptions(false);

      onSuccess();
    } catch (err: any) {
      console.error('Error creating shipment:', err);
      toast.error(err.response?.data?.message || 'Error al crear el envío');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = availableSales.filter(sale => {
    if (!searchSaleTerm) return true;
    const searchLower = searchSaleTerm.toLowerCase();
    const receiptNumber = sale.receipt_number?.toString().toLowerCase() || '';
    const totalStr = sale.total?.toFixed(2) || '0.00';
    const customerName = sale.customer?.person 
      ? `${sale.customer.person.first_name} ${sale.customer.person.last_name}`.toLowerCase()
      : '';
    return receiptNumber.includes(searchLower) || 
           customerName.includes(searchLower) ||
           totalStr.includes(searchLower);
  });


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* @ts-ignore */}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* @ts-ignore */}
        <DialogHeader>
          {/* @ts-ignore */}
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Crear Nuevo Envío
          </DialogTitle>
          {/* @ts-ignore */}
          <DialogDescription>
            Selecciona las ventas y completa la información de envío
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {/* Sección: Seleccionar Ventas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Seleccionar Ventas</h3>
              {newShipmentForm.sale_ids.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {newShipmentForm.sale_ids.length} venta{newShipmentForm.sale_ids.length !== 1 ? 's' : ''} seleccionada{newShipmentForm.sale_ids.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Buscador de ventas */}
            <Input
              placeholder="Buscar por número de recibo, cliente o monto..."
              value={searchSaleTerm}
              onChange={(e) => setSearchSaleTerm(e.target.value)}
              className="w-full"
            />

            {loadingSales ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay ventas disponibles</p>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No se encontraron ventas</p>
              </div>
            ) : (
              <div className="border rounded-lg max-h-64 overflow-y-auto p-2 space-y-2">
                {filteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => handleSaleToggle(sale.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      newShipmentForm.sale_ids.includes(sale.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={newShipmentForm.sale_ids.includes(sale.id)}
                          onChange={() => handleSaleToggle(sale.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <div>
                          <div className="font-medium">Venta #{sale.receipt_number || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(sale.date).toLocaleDateString('es-AR')} • ${sale.total?.toFixed(2) || '0.00'}
                          </div>
                          {sale.customer?.person && (
                            <div className="text-sm text-muted-foreground">
                              Cliente: {sale.customer.person.first_name} {sale.customer.person.last_name}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">Completada</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Sección: Información de Envío */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información de Envío</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado *</label>
                <Select
                  value={newShipmentForm.stage_id?.toString() || ''}
                  onValueChange={(value) => setNewShipmentForm(prev => ({ ...prev, stage_id: parseInt(value) }))}
                >
                  {/* @ts-ignore */}
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  {/* @ts-ignore */}
                  <SelectContent>
                    {stages
                      .filter(stage => stage.active)
                      .sort((a, b) => a.order - b.order)
                      .map((stage) => (
                        /* @ts-ignore */
                        <SelectItem key={stage.id} value={stage.id.toString()}>
                          {stage.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sucursal - Solo mostrar si hay múltiples sucursales */}
              {selectedBranchIds.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sucursal *</label>
                  <Select
                    value={newShipmentForm.branch_id?.toString() || ''}
                    onValueChange={(value) => setNewShipmentForm(prev => ({ ...prev, branch_id: parseInt(value) }))}
                  >
                    {/* @ts-ignore */}
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sucursal" />
                    </SelectTrigger>
                    {/* @ts-ignore */}
                    <SelectContent>
                      {selectedBranchIds.map((branchId) => {
                        const branchInfo = branches.find(b => String(b.id) === branchId);
                        // @ts-ignore
                        return (
                          // @ts-ignore
                          <SelectItem key={branchId} value={branchId}>
                            {branchInfo?.description || `Sucursal ${branchId}`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                        setNewShipmentForm(prev => ({ ...prev, transportista_id: undefined }));
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
                              setNewShipmentForm(prev => ({ ...prev, transportista_id: user.id }));
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
                        setNewShipmentForm(prev => ({ ...prev, cliente_id: undefined }));
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
                              setNewShipmentForm(prev => ({ ...prev, cliente_id: customer.id }));
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Dirección *</label>
                <Input
                  value={newShipmentForm.shipping_address}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, shipping_address: e.target.value }))}
                  placeholder="Calle y número"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ciudad *</label>
                <Input
                  value={newShipmentForm.shipping_city}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, shipping_city: e.target.value }))}
                  placeholder="Ciudad"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Provincia/Estado</label>
                <Input
                  value={newShipmentForm.shipping_state}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, shipping_state: e.target.value }))}
                  placeholder="Provincia"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Código Postal</label>
                <Input
                  value={newShipmentForm.shipping_postal_code}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, shipping_postal_code: e.target.value }))}
                  placeholder="CP"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">País</label>
                <Input
                  value={newShipmentForm.shipping_country}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, shipping_country: e.target.value }))}
                  placeholder="País"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridad</label>
                <Select
                  value={newShipmentForm.priority}
                  onValueChange={(value) => setNewShipmentForm(prev => ({ ...prev, priority: value }))}
                >
                  {/* @ts-ignore */}
                  <SelectTrigger>
                    <SelectValue />
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Estimada de Entrega</label>
                <Input
                  type="date"
                  value={newShipmentForm.estimated_delivery_date}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, estimated_delivery_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Costo de Envío</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newShipmentForm.shipping_cost}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, shipping_cost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notas</label>
              <textarea
                value={newShipmentForm.notes}
                onChange={(e) => setNewShipmentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales sobre el envío..."
                className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Botones */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateShipment}
              disabled={loading || newShipmentForm.sale_ids.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Envío
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

