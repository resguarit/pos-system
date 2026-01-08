import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Loader2, Search, FileText, Trash2, Calendar as CalendarIcon, DollarSign, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';
import { shipmentService } from '@/services/shipmentService';
import { ShipmentStage, User, Customer } from '@/types/shipment';
import { useBranch } from '@/context/BranchContext';
import { SaleHeader } from '@/types/sale';
import { Textarea } from '@/components/ui/textarea';

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
  const [loadingSales, setLoadingSales] = useState(false);
  const [foundSales, setFoundSales] = useState<SaleHeader[]>([]);
  const [selectedSales, setSelectedSales] = useState<SaleHeader[]>([]);
  const [showSalesOptions, setShowSalesOptions] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para búsqueda de transportista
  const [transporterSearch, setTransporterSearch] = useState('');
  const [showTransporterOptions, setShowTransporterOptions] = useState(false);

  // Estados para búsqueda de cliente  
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await request({ method: 'GET', url: '/users?include=person' });
      if (response?.data) {
        const usersData = Array.isArray(response.data) ? response.data : response.data.data || [];
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [request]);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await request({ method: 'GET', url: '/customers' });
      if (response?.data) {
        const customersData = Array.isArray(response.data) ? response.data : response.data.data || [];
        setCustomers(customersData);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, [request]);

  const fetchSales = useCallback(async () => {
    try {
      setLoadingSales(true);
      const branchIds = selectedBranchIds.length > 0 ? selectedBranchIds : ['1'];
      const params = new URLSearchParams();
      params.append('search', searchSaleTerm);
      params.append('per_page', '10');
      branchIds.forEach((id: string, index: number) => {
        params.append(`branch_id[${index}]`, id);
      });

      const response = await request({
        method: 'GET',
        url: `/sales/global?${params.toString()}`
      });

      if (response?.data) {
        const salesData = response.data.data || (Array.isArray(response.data) ? response.data : []);
        setFoundSales(salesData);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoadingSales(false);
    }
  }, [request, searchSaleTerm, selectedBranchIds]);

  // Cargar usuarios y clientes cuando se abre el dialog
  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchCustomers();

      const initialStage = stages.find(s => s.order === 1);
      if (initialStage) {
        setNewShipmentForm(prev => ({ ...prev, stage_id: initialStage.id }));
      }
    } else {
      setTransporterSearch('');
      setCustomerSearch('');
      setSearchSaleTerm('');
      setShowTransporterOptions(false);
      setShowCustomerOptions(false);
      setSelectedSales([]);
      setFoundSales([]);
    }
  }, [open, fetchUsers, fetchCustomers, stages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchSaleTerm.length >= 2) {
        fetchSales();
      } else {
        setFoundSales([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchSaleTerm, fetchSales]);

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

  const handleCreateShipment = async () => {
    if (selectedSales.length === 0) {
      toast.error('Selecciona al menos una venta');
      return;
    }

    if (!newShipmentForm.shipping_address) {
      toast.error('La dirección es obligatoria');
      return;
    }

    try {
      setLoading(true);

      const metadata: Record<string, string | number | null> = {
        shipping_state: newShipmentForm.shipping_state || null,
        shipping_postal_code: newShipmentForm.shipping_postal_code || null,
        shipping_country: newShipmentForm.shipping_country || 'Argentina',
        priority: newShipmentForm.priority || 'normal',
        estimated_delivery_date: newShipmentForm.estimated_delivery_date || null,
        notes: newShipmentForm.notes || null,
      };

      if (newShipmentForm.transportista_id) {
        metadata.transportista_id = newShipmentForm.transportista_id;
      }
      if (newShipmentForm.cliente_id) {
        metadata.cliente_id = newShipmentForm.cliente_id;
      }

      const branchId = selectedBranchIds.length === 1
        ? parseInt(selectedBranchIds[0], 10)
        : newShipmentForm.branch_id;

      const shipmentData = {
        sale_ids: selectedSales.map(s => s.id),
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
        branch_id: undefined,
      });

      setSearchSaleTerm('');
      setTransporterSearch('');
      setCustomerSearch('');
      setShowTransporterOptions(false);
      setShowCustomerOptions(false);

      onSuccess();
    } catch (err: unknown) {
      console.error('Error creating shipment:', err);
      // @ts-expect-error - request hook error handling
      if (err.response && err.response.data && err.response.data.errors) {
        // @ts-expect-error - request hook error handling
        const validationErrors = err.response.data.errors;
        const firstField = Object.keys(validationErrors)[0];
        const firstErrorMsg = validationErrors[firstField]?.[0];
        toast.error(firstErrorMsg || 'Hay errores de validación. Por favor revise el formulario.');
      } else {
        // @ts-expect-error - request hook error handling
        toast.error(err.response?.data?.message || 'Error al crear el envío');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* @ts-expect-error - Radix type issues */}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* @ts-expect-error - Radix type issues */}
        <DialogHeader>
          {/* @ts-expect-error - Radix type issues */}
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Crear Nuevo Envío
          </DialogTitle>
          {/* @ts-expect-error - Radix type issues */}
          <DialogDescription>
            Completa la información para generar un nuevo despacho. Puedes agregar múltiples ventas a este envío.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                Cliente del Envío
              </label>
              <div className="relative group/cust">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/cust:text-primary transition-colors">
                  <Search className="h-4 w-4" />
                </div>
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
                  className="pl-10 h-11 bg-white border-slate-200 rounded-xl focus:ring-primary/20 transition-all"
                />
                {showCustomerOptions && customers.filter(customer => {
                  const searchLower = customerSearch.toLowerCase();
                  const firstName = customer.person?.first_name || '';
                  const lastName = customer.person?.last_name || '';
                  const email = customer.email || '';
                  const fullName = `${firstName} ${lastName}`.toLowerCase();
                  return fullName.includes(searchLower) || email.toLowerCase().includes(searchLower);
                }).length > 0 && (
                    <div className="absolute left-0 right-0 border rounded-xl bg-white mt-1 max-h-48 overflow-auto z-50 shadow-xl animate-in fade-in zoom-in-95 duration-200">
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
                            className="p-3 cursor-pointer hover:bg-slate-50 border-b last:border-0 transition-colors"
                            role="button"
                            tabIndex={0}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              setNewShipmentForm(prev => ({
                                ...prev,
                                cliente_id: customer.id,
                                shipping_address: customer.person?.address || prev.shipping_address,
                                // @ts-expect-error - person might not have these but exist in DB
                                shipping_city: customer.person?.city || prev.shipping_city,
                                // @ts-expect-error - person might not have these but exist in DB
                                shipping_state: customer.person?.state || prev.shipping_state,
                                // @ts-expect-error - person might not have these but exist in DB
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
                      })}
                    </div>
                  )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Transportista
              </label>
              <div className="relative group/trans">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/trans:text-primary transition-colors">
                  <Search className="h-4 w-4" />
                </div>
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
                  className="pl-10 h-11 bg-white border-slate-200 rounded-xl focus:ring-primary/20 transition-all"
                />
                {showTransporterOptions && users.filter(user => {
                  const searchLower = transporterSearch.toLowerCase();
                  const firstName = user.person?.first_name || '';
                  const lastName = user.person?.last_name || '';
                  const email = user.email || '';
                  const fullName = `${firstName} ${lastName}`.toLowerCase();
                  return fullName.includes(searchLower) || email.toLowerCase().includes(searchLower);
                }).length > 0 && (
                    <div className="absolute left-0 right-0 border rounded-xl bg-white mt-1 max-h-48 overflow-auto z-50 shadow-xl animate-in fade-in zoom-in-95 duration-200">
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
                            className="p-3 cursor-pointer hover:bg-slate-50 border-b last:border-0 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setNewShipmentForm(prev => ({ ...prev, transportista_id: user.id }));
                              setTransporterSearch(`${name} (${email})`);
                              setShowTransporterOptions(false);
                            }}
                          >
                            <div className="font-medium">{name}</div>
                            <div className="text-xs text-muted-foreground">{email}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Dirección *</label>
                <Input
                  value={newShipmentForm.shipping_address}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, shipping_address: e.target.value }))}
                  placeholder="Calle y número"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ciudad</label>
                <Input
                  value={newShipmentForm.shipping_city}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, shipping_city: e.target.value }))}
                  placeholder="Ciudad"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Provincia/Estado</label>
                <Input
                  value={newShipmentForm.shipping_state}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, shipping_state: e.target.value }))}
                  placeholder="Provincia"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Código Postal</label>
                <Input
                  value={newShipmentForm.shipping_postal_code}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, shipping_postal_code: e.target.value }))}
                  placeholder="CP"
                  className="rounded-xl"
                />
              </div>
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
                value={searchSaleTerm}
                onChange={(e) => {
                  setSearchSaleTerm(e.target.value);
                  setShowSalesOptions(true);
                }}
                onFocus={() => setShowSalesOptions(true)}
                onBlur={() => setTimeout(() => setShowSalesOptions(false), 200)}
                placeholder="Buscar pedido por número, cliente o descripción..."
                className="pl-10 h-11 bg-slate-50 border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
              />

              {showSalesOptions && searchSaleTerm.length >= 2 && (
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
                            if (!selectedSales.find(s => s.id === sale.id)) {
                              setSelectedSales(prev => [...prev, sale]);
                            } else {
                              toast.error('Este pedido ya ha sido agregado.');
                            }
                            setSearchSaleTerm('');
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
                      No se encontraron pedidos con "{searchSaleTerm}"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado del Envío *</label>
              <Select
                value={newShipmentForm.stage_id?.toString() || ''}
                onValueChange={(value) => setNewShipmentForm(prev => ({ ...prev, stage_id: parseInt(value) }))}
              >
                {/* @ts-expect-error - SelectTrigger className */}
                <SelectTrigger className="rounded-xl">
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
                value={newShipmentForm.priority}
                onValueChange={(value) => setNewShipmentForm(prev => ({ ...prev, priority: value }))}
              >
                {/* @ts-expect-error - SelectTrigger className */}
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedBranchIds.length > 1 ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Sucursal *</label>
                <Select
                  value={newShipmentForm.branch_id?.toString() || ''}
                  onValueChange={(value) => setNewShipmentForm(prev => ({ ...prev, branch_id: parseInt(value) }))}
                >
                  {/* @ts-expect-error - SelectTrigger className */}
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBranchIds.map((branchId) => {
                      const branchInfo = branches.find(b => String(b.id) === branchId);
                      return (
                        <SelectItem key={branchId} value={branchId}>
                          {branchInfo?.description || `Sucursal ${branchId}`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ) : <div className="hidden md:block"></div>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Entrega Estimada
              </label>
              <Input
                type="date"
                value={newShipmentForm.estimated_delivery_date}
                onChange={(e) => setNewShipmentForm(prev => ({ ...prev, estimated_delivery_date: e.target.value }))}
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
                  value={newShipmentForm.shipping_cost}
                  onChange={(e) => setNewShipmentForm(prev => ({ ...prev, shipping_cost: e.target.value }))}
                  placeholder="0.00"
                  className="pl-7 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notas Adicionales</label>
            <Textarea
              value={newShipmentForm.notes}
              onChange={(e) => setNewShipmentForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Información adicional para el envío..."
              className="min-h-[100px] rounded-xl"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white"
            onClick={handleCreateShipment}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Envío'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
