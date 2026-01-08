import React, { useState } from 'react';
import { ShipmentStage, Role, UpsertShipmentStageRequest } from '@/types/shipment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { shipmentService } from '@/services/shipmentService';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface StageConfiguratorProps {
  stages: ShipmentStage[];
  roles: Role[];
  onStageUpdate: () => void;
}

const StageConfigurator: React.FC<StageConfiguratorProps> = ({ stages, onStageUpdate }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ShipmentStage | null>(null);
  const [formData, setFormData] = useState<UpsertShipmentStageRequest>({
    name: '',
    description: '',
    order: 0,
    is_active: true,
    config: {},
  });
  const [loading, setLoading] = useState(false);

  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<ShipmentStage | null>(null);

  const handleOpenDialog = (stage?: ShipmentStage) => {
    if (stage) {
      setEditingStage(stage);
      setFormData({
        id: stage.id,
        name: stage.name,
        description: stage.description || '',
        order: stage.order,
        is_active: stage.is_active,
        config: stage.config || {},
      });
    } else {
      setEditingStage(null);
      // Calculate next order
      const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) : 0;
      setFormData({
        name: '',
        description: '',
        order: maxOrder + 1,
        is_active: true,
        config: {},
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      setLoading(true);
      await shipmentService.upsertStage(formData);
      toast.success(editingStage ? 'Etapa actualizada correctamente' : 'Etapa creada correctamente');
      setIsDialogOpen(false);
      onStageUpdate();
    } catch (error) {
      console.error('Error saving stage:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const errorMessage = err.response?.data?.error?.message || err.message || 'Error al guardar la etapa';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!stageToDelete) return;

    try {
      setLoading(true);
      await shipmentService.deleteStage(stageToDelete.id);
      toast.success('Etapa eliminada correctamente');
      setIsDeleteDialogOpen(false);
      onStageUpdate();
    } catch (error) {
      console.error('Error deleting stage:', error);
      const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const errorMessage = err.response?.data?.error?.message || err.message || 'Error al eliminar la etapa. Verifica que no tenga envíos asociados.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setStageToDelete(null);
    }
  };

  const handleDeleteClick = (stage: ShipmentStage) => {
    setStageToDelete(stage);
    setIsDeleteDialogOpen(true);
  };

  // Check if a stage is protected from deletion
  const isStageProtected = (stage: ShipmentStage): boolean => {
    const protectedNames = ['anulado', 'cancelado', 'pendiente', 'entregado'];
    const normalizedName = stage.name.toLowerCase().trim();
    return stage.order <= 1 || protectedNames.includes(normalizedName);
  };

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Etapas del Flujo</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Etapa
        </Button>
      </div>

      <div className="grid gap-4">
        {sortedStages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">No hay etapas configuradas</p>
              <Button variant="outline" onClick={onStageUpdate}>
                Recargar
              </Button>
            </CardContent>
          </Card>
        ) : (
          sortedStages.map((stage) => (
            <Card key={stage.id} className="transition-all hover:shadow-md">
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      {stage.order}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {stage.name}
                        {!stage.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactiva</Badge>
                        )}
                      </CardTitle>
                      {stage.description && (
                        <p className="text-sm text-gray-500 mt-1">{stage.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isStageProtected(stage) ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled>
                              <Lock className="h-4 w-4 text-gray-300" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Esta etapa es crítica y no puede modificarse</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(stage)}>
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Button>
                    )}
                    {isStageProtected(stage) ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" disabled>
                              <Lock className="h-4 w-4 text-gray-300" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Esta etapa es crítica y no puede eliminarse</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(stage)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {stage.config && Object.keys(stage.config).length > 0 && (
                <CardContent className="pt-0 pb-4 pl-16">
                  <pre className="text-xs bg-gray-50 p-2 rounded text-gray-600 overflow-hidden text-ellipsis">
                    Config: {JSON.stringify(stage.config)}
                  </pre>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Editar Etapa' : 'Nueva Etapa'}</DialogTitle>
            <DialogDescription>
              Configura los detalles de la etapa del flujo de envíos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                placeholder="Ej. En Preparación"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descripción
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="Descripción opcional..."
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="order" className="text-right">
                Orden
              </Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="active" className="text-right">
                Activa
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="active" className="font-normal text-gray-500">
                  {formData.is_active ? 'La etapa está visible y utilizable' : 'La etapa está oculta'}
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la etapa
              <span className="font-bold text-gray-900"> {stageToDelete?.name}</span>.
              Si hay envíos en esta etapa, no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StageConfigurator;


