/**
 * StockTransferDialog Component
 * Creates or edits a stock transfer between branches
 * 
 * Best Practices Applied:
 * - Single component for Create and Edit (DRY principle)
 * - Separation of concerns via custom hook
 * - Zod validation for runtime type safety
 * - Reusable sub-components
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Loader2, ArrowRightLeft, Package, Search, Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

import { useStockTransfer } from './hooks/useStockTransfer';
import { ProductSearch, TransferItemsTable } from './components';
import { ImportSalesPanel } from './components/ImportSalesPanel';

export interface StockTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  /** Transfer ID for edit mode. If undefined, creates new transfer */
  transferId?: number;
  preselectedSourceBranchId?: number;
  visibleBranchIds?: string[];
}

export function StockTransferDialog({
  open,
  onOpenChange,
  onSaved,
  transferId,
  preselectedSourceBranchId,
  visibleBranchIds,
}: StockTransferDialogProps) {
  const {
    form,
    items,
    branches,
    allBranches,
    products,
    loading,
    isSubmitting,
    isEditMode,
    setForm,
    addItem,
    addItems,
    removeItem,
    updateItemQuantity,
    getProductStock,
    submit,
  } = useStockTransfer({
    transferId,
    preselectedSourceBranchId,
    onSuccess: onSaved,
    visibleBranchIds,
    onClose: () => onOpenChange(false),
  });

  // Key para forzar remount del ImportSalesPanel cuando el diálogo se abre
  const [importPanelKey, setImportPanelKey] = useState(0);

  // Incrementar key cuando el diálogo se abre para resetear el panel
  useEffect(() => {
    if (open) {
      setImportPanelKey(prev => prev + 1);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  const dialogTitle = isEditMode ? 'Editar Transferencia' : 'Nueva Transferencia de Stock';
  const dialogDescription = isEditMode
    ? 'Modifique los datos de la transferencia'
    : 'Transfiera productos entre sucursales';
  const submitButtonText = isEditMode ? 'Guardar Cambios' : 'Crear Transferencia';

  // User requested: Source can be ANY branch. Destination must be one of the SELECTED branches (or the current one if editing).
  // HOWEVER, if the user selects one of their selected branches as Source (Sending stock), 
  // restricting Destination to selected branches would result in 0 options.
  // So: If the restriction results in empty options, we unblock and show All Branches (Switch to "Sending" mode).
  const sourceBranchOptions = allBranches;

  const filteredSelectedBranches = branches.filter(b => b.id.toString() !== form.source_branch_id);
  // If we have selected branches, but filtering removes them all, it means we selected the ONLY allowed branch as source.
  const isDestinationBlocked = filteredSelectedBranches.length === 0 && branches.length > 0;

  const destinationBaseOptions = (isEditMode || isDestinationBlocked) ? allBranches : branches;
  const destinationBranchOptions = destinationBaseOptions.filter(b => b.id.toString() !== form.source_branch_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-full max-h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Branch Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source_branch_id">Sucursal Origen *</Label>
                <Select
                  value={form.source_branch_id}
                  onValueChange={(value) => setForm(prev => ({ ...prev, source_branch_id: value }))}
                  disabled={loading || isEditMode}
                >
                  <SelectTrigger id="source_branch_id">
                    <SelectValue placeholder="Seleccione sucursal de origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceBranchOptions.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.description || branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination_branch_id">Sucursal Destino *</Label>
                <Select
                  value={form.destination_branch_id}
                  onValueChange={(value) => setForm(prev => ({ ...prev, destination_branch_id: value }))}
                  disabled={loading || isEditMode}
                >
                  <SelectTrigger id="destination_branch_id">
                    <SelectValue placeholder="Seleccione sucursal de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationBranchOptions.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.description || branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Fecha de Transferencia *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.transfer_date && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.transfer_date
                      ? format(form.transfer_date, "PPP", { locale: es })
                      : <span>Seleccione fecha</span>
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.transfer_date}
                    onSelect={(date) => date && setForm(prev => ({ ...prev, transfer_date: date }))}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales..."
                rows={2}
                disabled={loading}
              />
            </div>

            {/* Products Section with Tabs */}
            <div className="border-t pt-4">
              <Tabs defaultValue="manual" className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Productos
                  </Label>
                  <TabsList>
                    <TabsTrigger value="manual" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Manual
                    </TabsTrigger>
                    <TabsTrigger value="import" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Importar Ventas
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="manual" className="space-y-4">
                  <ProductSearch
                    products={products}
                    sourceBranchId={form.source_branch_id}
                    onAddItem={addItem}
                    getProductStock={getProductStock}
                    disabled={loading || !form.source_branch_id}
                  />
                </TabsContent>

                <TabsContent value="import">
                  <div className="border rounded-md p-4 bg-muted/10">
                    <ImportSalesPanel
                      key={importPanelKey}
                      onImport={addItems}
                      sourceBranchId={form.source_branch_id}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Items Table - Shared for both methods */}
              <div className="mt-6">
                <TransferItemsTable
                  items={items}
                  onRemoveItem={removeItem}
                  onUpdateQuantity={updateItemQuantity}
                  disabled={loading}
                />
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || loading || items.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Alias for backward compatibility
export { StockTransferDialog as NewStockTransferDialog };
