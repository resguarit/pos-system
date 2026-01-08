/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X, Eye, Pencil } from 'lucide-react';
import { purchaseOrderService, type PurchaseOrder } from '@/lib/api/purchaseOrderService';
import NewPurchaseOrderDialog from '@/components/new-purchase-order-dialog';
import EditPurchaseOrderDialog from '@/components/edit-purchase-order-dialog';
import { ViewPurchaseOrderDialog } from '@/components/view-purchase-order-dialog';
import CompleteOrderDialog from '@/components/complete-order-dialog-simple';
import { toast } from "sonner";

type CurrencyTotals = {
  ARS?: number;
  USD?: number;
};

type SummaryResponse = {
  from: string;
  to: string;
  totals: CurrencyTotals;
};

function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
function formatAmount(amount?: number, currency?: string) {
  if (amount == null) return "-";
  return `${currency === "USD" ? "US$" : "$"}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [from, setFrom] = useState<string>(formatDate(firstDay));
  const [to, setTo] = useState<string>(formatDate(lastDay));
  const [totals, setTotals] = useState<CurrencyTotals>({});
  const [totalsLoading, setTotalsLoading] = useState(false);
  const [totalsError, setTotalsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [orderToComplete, setOrderToComplete] = useState<PurchaseOrder | null>(null);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrderService.getAll();
      setPurchaseOrders(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las órdenes de compra');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPurchaseOrders(); }, []);

  useEffect(() => {
    async function fetchTotals() {
      setTotalsLoading(true);
      setTotalsError(null);
      try {
        const params = new URLSearchParams({ from, to });
        const res = await fetch(`/api/purchase-orders/summary-by-currency?${params}`);
        if (!res.ok) throw new Error("Error al obtener totales");
        const data: SummaryResponse = await res.json();
        setTotals(data.totals || {});
      } catch (err: any) {
        setTotalsError(err.message || "Error desconocido");
      } finally {
        setTotalsLoading(false);
      }
    }
    fetchTotals();
  }, [from, to]);

  const handleComplete = (order: PurchaseOrder) => {
    alert(`Intentando completar orden ${order.id} - Total: $${order.total_amount} - Proveedor: ${order.supplier?.name}`);
    setOrderToComplete(order);
    setShowCompleteDialog(true);
  };

  const handleCompleteWithPayment = async (paymentMethodId: number) => {
    if (!orderToComplete?.id) return;

    try {
      await purchaseOrderService.finalize(orderToComplete.id, paymentMethodId);
      toast.success("Orden completada", {
        description: "La orden de compra se completó y el stock se actualizó correctamente."
      });
      loadPurchaseOrders();
    } catch (err: any) {
      toast.error("Error al completar la orden", {
        description: err.message || "Error al completar la orden de compra"
      });
      throw err; // Re-throw para que el modal maneje el error
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await purchaseOrderService.cancel(id);
      toast.success("Orden cancelada", { description: "La orden de compra se canceló correctamente." });
      loadPurchaseOrders();
    } catch (err: any) {
      toast.error("Error al cancelar la orden", { description: err.message || "Error al cancelar la orden de compra" });
    }
  };

  const getStatusBadge = (status: string) => {
    const v = (status || '').toLowerCase();
    switch (v) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completada</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isPending = (status?: string | null) => {
    const v = (status ?? '').toLowerCase();
    return v === '' || v === 'pending';
  };

  const formatDateForDisplay = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES');
  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Cargando órdenes de compra...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Card de totales por moneda y período */}
      <div className="mb-6 p-4 bg-white rounded shadow">
        <div className="flex flex-col md:flex-row md:items-center md:gap-6">
          <div>
            <label className="mr-2">Desde:</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <div>
            <label className="mr-2">Hasta:</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border rounded px-2 py-1" />
          </div>
        </div>
        <div className="mt-4">
          <div className="font-semibold">Total compras ARS: <span className="text-green-700">{formatAmount(totals.ARS, "ARS")}</span></div>
          <div className="font-semibold">Total compras USD: <span className="text-blue-700">{formatAmount(totals.USD, "USD")}</span></div>
          <div className="mt-2 text-sm text-gray-600">Período: {from && to ? `${formatDateForDisplay(from)} al ${formatDateForDisplay(to)}` : "-"}</div>
          {totalsLoading && <div className="text-xs text-gray-400 mt-2">Cargando...</div>}
          {totalsError && <div className="text-xs text-red-500 mt-2">{totalsError}</div>}
        </div>
      </div>

      {/* ...resto del dashboard... */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Órdenes de Compra</h1>
          <p className="text-gray-600">Gestione las compras a proveedores</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden de Compra
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Órdenes de Compra</CardTitle>
          <CardDescription> Todas las órdenes de compra registradas en el sistema </CardDescription>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No hay órdenes de compra registradas</p>
              <Button onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera orden
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.supplier?.name}</div>
                        {order.supplier?.contact_name && (
                          <div className="text-sm text-gray-500">Contacto: {order.supplier.contact_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.branch?.description}</TableCell>
                    <TableCell>{formatDateForDisplay(order.order_date)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : (order.total_amount || 0))}
                      {order.currency && (
                        <span className="ml-1 font-bold text-gray-700">{order.currency}</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status || 'pending')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {isPending(order.status) && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleComplete(order)} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                              <Check className="h-4 w-4 mr-1" />
                              Completar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleCancel(order.id!)} className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100">
                              <X className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedId(order.id!); setShowEditDialog(true); }} className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" onClick={() => { setSelectedId(order.id!); setShowViewDialog(true); }}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewPurchaseOrderDialog open={showNewDialog} onOpenChange={setShowNewDialog} onSaved={loadPurchaseOrders} />
      {selectedId && (
        <EditPurchaseOrderDialog open={showEditDialog} onOpenChange={setShowEditDialog} purchaseOrderId={selectedId} onSaved={loadPurchaseOrders} />
      )}
      <ViewPurchaseOrderDialog open={showViewDialog} onOpenChange={setShowViewDialog} purchaseOrderId={selectedId || 0} />

      {orderToComplete && (
        <CompleteOrderDialog
          open={showCompleteDialog}
          onOpenChange={setShowCompleteDialog}
          orderId={orderToComplete.id!}
          orderTotal={typeof orderToComplete.total_amount === 'string' ? parseFloat(orderToComplete.total_amount) : (orderToComplete.total_amount || 0)}
          supplierName={orderToComplete.supplier?.name || 'N/A'}
          onComplete={handleCompleteWithPayment}
        />
      )}
    </div>
  );
}
