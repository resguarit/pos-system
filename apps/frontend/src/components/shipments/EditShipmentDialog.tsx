import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { SaleHeader } from '@/types/sale';
import { Loader2, Trash2, Search, Package, DollarSign, Calendar as CalendarIcon, User as UserIcon, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';
import { shipmentService } from '@/services/shipmentService';
import { Shipment, ShipmentStage, User, Customer, Sale } from '@/types/shipment';
import { useAuth } from '@/context/AuthContext';

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

  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Estados para búsqueda de transportista
  const [transporterSearch, setTransporterSearch] = useState('');
  const [showTransporterOptions, setShowTransporterOptions] = useState(false);

  // Estados para búsqueda de cliente  
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);

  // Estados para gestión de ventas
  const [selectedSales, setSelectedSales] = useState<SaleHeader[]>([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [foundSales, setFoundSales] = useState<SaleHeader[]>([]);
  const [showSalesOptions, setShowSalesOptions] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

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

  // Debounced server-side search for transportista
  const searchUsersDebounced = useCallback(async (term: string) => {
    setSearchingUsers(true);
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
  }, [request]);

  // Debounced server-side search for customer
  const searchCustomersDebounced = useCallback(async (term: string) => {
    setSearchingCustomers(true);
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
  }, [request]);

  // Cargar usuarios y clientes cuando se abre el dialog
  const fetchShipmentData = useCallback(async () => {
    if (!shipmentId) return;

    try {
      setLoadingData(true);
      const shipmentData = await shipmentService.getShipment(shipmentId);

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

        // Inicializar ventas seleccionadas
        // @ts-expect-error - mapping between Sale and SaleHeader
        const mappedSales: SaleHeader[] = (shipmentData.sales || []).map((s: Sale) => ({
          id: s.id,
          date: s.date,
          receipt_number: s.receipt_number,
          total: s.total,
          status: s.status,
          customer: typeof s.customer === 'string'
            ? { id: s.customer_id, business_name: s.customer }
            : (s.customer ? { id: s.customer.id, person: s.customer.person } : undefined),
          receipt_type: s.receipt_type ? {
            id: s.receipt_type.id,
            name: s.receipt_type.name || s.receipt_type.description || '',
            afip_code: s.receipt_type.afip_code || ''
          } : undefined
        }));
        setSelectedSales(mappedSales);

        // Establecer búsquedas
        if (shipmentData.metadata?.transportista_id) {
          // will be handled by useEffect that watches users
        }
      }
    } catch (error) {
      console.error('Error fetching shipment:', error);
      toast.error('Error al cargar los datos del envío');
    } finally {
      setLoadingData(false);
    }
  }, [shipmentId]);

  // Fetch transporter name when editing a shipment with transportista_id
  const populateTransporterName = useCallback(async (transporterId: number) => {
    try {
      const response = await request({ method: 'GET', url: `/users/${transporterId}` });
      if (response?.data) {
        const user = response.data.data || response.data;
        if (user?.person) {
          const name = `${user.person.first_name} ${user.person.last_name}`;
          const email = user.email || '';
          setTransporterSearch(`${name} (${email})`);
        }
      }
    } catch (error) {
      console.error('Error fetching transporter:', error);
    }
  }, [request]);

  // Fetch customer name when editing a shipment with customer_id
  const populateCustomerName = useCallback(async (customerId: number) => {
    try {
      const response = await request({ method: 'GET', url: `/customers/${customerId}` });
      if (response?.data) {
        const customer = response.data.data || response.data;
        if (customer?.person) {
          const firstName = customer.person.first_name?.trim() || '';
          const lastName = customer.person.last_name?.trim() || '';
          const fullName = [firstName, lastName].filter(Boolean).join(' ');
          const email = customer.email || '';
          setCustomerSearch(`${fullName}${email ? ` (${email})` : ''}`);
        }
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  }, [request]);

  useEffect(() => {
    if (shipment) {
      const transporterId = shipment.metadata?.transportista_id;
      if (transporterId) {
        populateTransporterName(transporterId);
      }
    }
  }, [shipment, populateTransporterName]);

  useEffect(() => {
    if (shipment) {
      const customerId = shipment.sales && shipment.sales.length > 0 ? shipment.sales[0].customer_id : undefined;
      if (customerId) {
        populateCustomerName(customerId);
      }
    }
  }, [shipment, populateCustomerName]);

  const fetchSales = useCallback(async (search: string) => {
    if (!search || search.length < 2) {
      setFoundSales([]);
      return;
    }

    try {
      setLoadingSales(true);
      const apiParams: Record<string, string | number | string[] | number[]> = {
        search: search,
        per_page: 10
      };

      if (shipment?.branch_id) {
        apiParams['branch_id[]'] = [shipment.branch_id];
      }

      const response = await request({
        method: 'GET',
        url: '/sales/global',
        params: apiParams
      });

      let salesData: SaleHeader[] = [];
      if (response?.data?.data) {
        salesData = response.data.data;
      } else if (response?.data) {
        salesData = response.data;
      } else if (Array.isArray(response)) {
        salesData = response;
      }

      const filtered = salesData.filter(s => !selectedSales.some(sel => sel.id === s.id));
      setFoundSales(filtered);
    } catch (error) {
      console.error('Error searching sales:', error);
    } finally {
      setLoadingSales(false);
    }
  }, [request, shipment?.branch_id, selectedSales]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (salesSearch) {
        fetchSales(salesSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [salesSearch, fetchSales]);

  // Debounced transportista search
  useEffect(() => {
    if (!showTransporterOptions) return;
    const timer = setTimeout(() => {
      searchUsersDebounced(transporterSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [transporterSearch, showTransporterOptions, searchUsersDebounced]);

  // Debounced customer search
  useEffect(() => {
    if (!showCustomerOptions) return;
    const timer = setTimeout(() => {
      searchCustomersDebounced(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, showCustomerOptions, searchCustomersDebounced]);

  useEffect(() => {
    if (open) {
      fetchShipmentData();
    } else {
      setTransporterSearch('');
      setCustomerSearch('');
      setShowTransporterOptions(false);
      setShowCustomerOptions(false);
      setShowCancelConfirm(false);
      setShipment(null);
      setUsers([]);
      setCustomers([]);
    }
  }, [open, fetchShipmentData]);

  const handleUpdateShipment = async () => {
    if (!shipmentId) return;

    try {
      setLoading(true);

      const metadata: Record<string, string | number | null> = {
        shipping_state: editForm.shipping_state || null,
        shipping_postal_code: editForm.shipping_postal_code || null,
        shipping_country: editForm.shipping_country || 'Argentina',
        priority: editForm.priority || 'normal',
        estimated_delivery_date: editForm.estimated_delivery_date || null,
        notes: editForm.notes || null,
        transportista_id: editForm.transportista_id || null,
        cliente_id: editForm.cliente_id || null
      };

      const shipmentData = {
        shipping_address: editForm.shipping_address || '',
        shipping_city: editForm.shipping_city || '',
        shipping_state: editForm.shipping_state || null,
        shipping_postal_code: editForm.shipping_postal_code || null,
        shipping_country: editForm.shipping_country || null,
        priority: editForm.priority || null,
        estimated_delivery_date: editForm.estimated_delivery_date || null,
        notes: editForm.notes || null,
        shipping_cost: editForm.shipping_cost !== '' ? parseFloat(editForm.shipping_cost) : 0,
        metadata: metadata,
        current_stage_id: editForm.stage_id,
        version: shipment?.version || 1,
        sale_ids: selectedSales.map(s => s.id),
      };

      await shipmentService.updateShipment(shipmentId, shipmentData);

      toast.success('Envío actualizado exitosamente');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      console.error('Error updating shipment:', err);
      // @ts-expect-error - request hook error handling
      if (err.response && err.response.data && err.response.data.errors) {
        // @ts-expect-error - request hook error handling
        const validationErrors = err.response.data.errors;
        const firstField = Object.keys(validationErrors)[0];
        const firstErrorMsg = validationErrors[firstField]?.[0];
        toast.error(firstErrorMsg || 'Hay errores de validación. Por favor revise el formulario.');
      } else {
        // @ts-expect-error - request hook error handling
        toast.error(err.response?.data?.message || 'Error al actualizar el envío');
      }
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
    } catch (err: unknown) {
      console.error('Error cancelling shipment:', err);
      // @ts-expect-error - request hook error handling
      toast.error(err.response?.data?.message || 'Error al cancelar el envío');
    } finally {
      setLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  if (loadingData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* @ts-expect-error - Radix DialogContent props mismatch */}
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
      {/* @ts-expect-error - Radix type issues */}
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Editar Envío {shipment?.reference}</DialogTitle>
          <DialogDescription>
            Modifica los detalles del envío, transportista y pedidos asociados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado/Etapa *</label>
            <Select
              value={editForm.stage_id?.toString() || ''}
              onValueChange={(value) => setEditForm(prev => ({ ...prev, stage_id: parseInt(value) }))}
            >
              {/* @ts-expect-error - SelectTrigger className */}
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {stages
                  .filter(stage => stage.is_active)
                  .sort((a, b) => a.order - b.order)
                  .map((stage) => (
                    <SelectItem key={stage.id} value={stage.id.toString()}>
                      {stage.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Prioridad</label>
            <Select
              value={editForm.priority}
              onValueChange={(value) => setEditForm(prev => ({ ...prev, priority: value }))}
            >
              {/* @ts-expect-error - SelectTrigger className */}
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Transportista</label>
            <div className="relative">
              <Input
                value={transporterSearch}
                onChange={(e) => {
                  const v = e.target.value;
                  setTransporterSearch(v);
                  setShowTransporterOptions(true);
                  if (!v) {
                    setEditForm(prev => ({ ...prev, transportista_id: undefined }));
                  }
                }}
                onFocus={() => {
                  setShowTransporterOptions(true);
                  if (users.length === 0) searchUsersDebounced('');
                }}
                onBlur={() => setTimeout(() => setShowTransporterOptions(false), 200)}
                placeholder="Buscar transportista..."
              />
              {showTransporterOptions && (
                <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                  {searchingUsers ? (
                    <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Buscando...
                    </div>
                  ) : users.length > 0 ? (
                    users.map((user) => {
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
                    })
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                      {transporterSearch.trim() ? 'No se encontraron usuarios' : 'Escriba para buscar'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              Cliente del Envío
            </label>
            <div className="relative">
              <Input
                value={customerSearch}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomerSearch(v);
                  setShowCustomerOptions(true);
                  if (!v) {
                    setEditForm(prev => ({ ...prev, cliente_id: undefined }));
                  }
                }}
                onFocus={() => {
                  setShowCustomerOptions(true);
                  if (customers.length === 0) searchCustomersDebounced('');
                }}
                onBlur={() => setTimeout(() => setShowCustomerOptions(false), 200)}
                placeholder="Buscar cliente para el envío..."
                className="bg-white/50 focus:bg-white transition-colors"
              />
              {showCustomerOptions && (
                <div className="absolute left-0 right-0 border rounded-lg bg-white mt-1 max-h-40 overflow-auto z-50 shadow-xl border-slate-200">
                  {searchingCustomers ? (
                    <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Buscando...
                    </div>
                  ) : customers.length > 0 ? (
                    customers.map((customer) => {
                      const firstName = customer.person?.first_name?.trim() || '';
                      const lastName = customer.person?.last_name?.trim() || '';
                      const email = customer.email || '';
                      const fullName = [firstName, lastName].filter(Boolean).join(' ');
                      const name = fullName || email || 'Cliente sin nombre';

                      return (
                        <div
                          key={customer.id}
                          className="p-3 cursor-pointer hover:bg-slate-50 border-b last:border-0 transition-colors"
                          role="button"
                          tabIndex={0}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            setEditForm(prev => ({
                              ...prev,
                              cliente_id: customer.id,
                              shipping_address: customer.person?.address || prev.shipping_address,
                              // @ts-expect-error - person might not have city/state/postal_code in all types but it exists in DB
                              shipping_city: customer.person?.city || prev.shipping_city,
                              // @ts-expect-error - person might not have city/state/postal_code in all types but it exists in DB
                              shipping_state: customer.person?.state || prev.shipping_state,
                              // @ts-expect-error - person might not have city/state/postal_code in all types but it exists in DB
                              shipping_postal_code: customer.person?.postal_code || prev.shipping_postal_code,
                            }));

                            setCustomerSearch(`${name}${email ? ` (${email})` : ''}`);
                            setShowCustomerOptions(false);
                          }}
                        >
                          <div className="font-medium">{name}</div>
                          {email && <div className="text-xs text-muted-foreground">{email}</div>}
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                      {customerSearch.trim() ? 'No se encontraron clientes' : 'Escriba para buscar'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección *</label>
              <Input
                value={editForm.shipping_address}
                onChange={(e) => setEditForm(prev => ({ ...prev, shipping_address: e.target.value }))}
                placeholder="Calle y número"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Provincia/Estado</label>
              <Input
                value={editForm.shipping_state}
                onChange={(e) => setEditForm(prev => ({ ...prev, shipping_state: e.target.value }))}
                placeholder="Provincia o estado"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ciudad</label>
              <Input
                value={editForm.shipping_city}
                onChange={(e) => setEditForm(prev => ({ ...prev, shipping_city: e.target.value }))}
                placeholder="Ciudad"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Código Postal</label>
              <Input
                value={editForm.shipping_postal_code}
                onChange={(e) => setEditForm(prev => ({ ...prev, shipping_postal_code: e.target.value }))}
                placeholder="CP"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-base font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Pedidos en este Envío
                <Badge variant="secondary" className="ml-2">
                  {selectedSales.length}
                </Badge>
              </label>
              {selectedSales.length > 0 && (
                <div className="text-sm font-medium text-muted-foreground">
                  Subtotal Pedidos: <span className="text-foreground">{formatCurrency(selectedSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0))}</span>
                </div>
              )}
            </div>

            <div className="relative group/search">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors">
                <Search className="h-4 w-4" />
              </div>
              <Input
                value={salesSearch}
                onChange={(e) => {
                  setSalesSearch(e.target.value);
                  setShowSalesOptions(true);
                }}
                onFocus={() => setShowSalesOptions(true)}
                onBlur={() => setTimeout(() => setShowSalesOptions(false), 200)}
                placeholder="Buscar pedido por número, cliente o descripción..."
                className="pl-10 h-11 bg-slate-50 border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
              />

              {showSalesOptions && salesSearch.length >= 2 && (
                <div className="absolute left-0 right-0 border rounded-xl bg-white mt-2 max-h-64 overflow-auto z-[60] shadow-2xl border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                  {loadingSales ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Buscando pedidos...
                    </div>
                  ) : foundSales.length > 0 ? (
                    <div className="p-1">
                      {foundSales.map((sale: SaleHeader) => (
                        <div
                          key={sale.id}
                          className="p-3 cursor-pointer hover:bg-slate-50 rounded-lg flex items-center justify-between group/item transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedSales(prev => [...prev, sale as SaleHeader]);
                            setSalesSearch('');
                            setShowSalesOptions(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 group-hover/item:bg-white rounded-lg transition-colors">
                              <FileText className="h-4 w-4 text-slate-500 group-hover/item:text-primary" />
                            </div>
                            <div>
                              <div className="font-bold text-sm">
                                #{sale.receipt_number || sale.id}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {typeof sale.customer === 'string'
                                  ? sale.customer
                                  : (sale.customer?.person
                                    ? `${sale.customer.person.first_name || ''} ${sale.customer.person.last_name || ''}`.trim()
                                    : (sale.customer?.business_name || 'Cliente desconocido'))} • {new Date(sale.date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">{formatCurrency(Number(sale.total) || 0)}</div>
                            <Badge variant="outline" className="text-[10px] h-4 py-0 group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                              {sale.receipt_type ? (typeof sale.receipt_type === 'string' ? sale.receipt_type : (sale.receipt_type.name || sale.receipt_type.description)) : 'Venta'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-sm text-slate-400 text-center flex flex-col items-center">
                      <Search className="h-8 w-8 mb-2 opacity-20" />
                      No se encontraron pedidos con "{salesSearch}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedSales.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {selectedSales.map(sale => (
                  <div key={sale.id} className="group flex items-start justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">
                          #{sale.receipt_number || sale.id}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex flex-col">
                          <span>
                            {typeof sale.customer === 'string'
                              ? sale.customer
                              : (sale.customer?.person
                                ? `${sale.customer.person.first_name || ''} ${sale.customer.person.last_name || ''}`.trim()
                                : (sale.customer?.business_name || 'Cliente desconocido'))}
                          </span>
                          <span className="font-semibold text-emerald-600 mt-1">{formatCurrency(Number(sale.total) || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      onClick={() => setSelectedSales(prev => prev.filter(s => s.id !== sale.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 border-2 border-dashed rounded-xl border-slate-200 flex flex-col items-center justify-center text-muted-foreground bg-slate-50/30">
                <Package className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">No hay pedidos vinculados a este envío</p>
                <p className="text-xs">Usa el buscador arriba para agregar uno</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Entrega Estimada
              </label>
              <Input
                type="date"
                value={editForm.estimated_delivery_date}
                onChange={(e) => setEditForm(prev => ({ ...prev, estimated_delivery_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Costo de Envío
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.shipping_cost}
                  onChange={(e) => setEditForm(prev => ({ ...prev, shipping_cost: e.target.value }))}
                  className="pl-7 rounded-xl"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notas/Observaciones</label>
            <Textarea
              value={editForm.notes}
              onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Información adicional para el envío..."
              className="min-h-[80px] rounded-xl"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 pb-2 border-t border-slate-100 bg-white flex-shrink-0">
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-slate-200 hover:bg-slate-50"
            onClick={() => setShowCancelConfirm(true)}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cancelar Envío
          </Button>

          <Button
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
            onClick={handleUpdateShipment}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </div>
      </DialogContent>

      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        {/* @ts-expect-error - Radix type issues */}
        <DialogContent className="max-w-md">
          {/* @ts-expect-error - Radix type issues */}
          <DialogHeader>
            {/* @ts-expect-error - Radix type issues */}
            <DialogTitle className="flex items-center gap-2 text-red-600">
              ¿Confirmas cancelar este envío?
            </DialogTitle>
            {/* @ts-expect-error - Radix type issues */}
            <DialogDescription>
              Esta acción no se puede deshacer. El envío será eliminado y los pedidos asociados quedarán disponibles para un nuevo envío.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
              No, volver
            </Button>
            <Button variant="destructive" onClick={handleCancelShipment} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, cancelar envío'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
