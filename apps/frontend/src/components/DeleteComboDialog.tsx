// components/DeleteComboDialog.tsx
import React, { useState } from 'react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle } from 'lucide-react';
import { sileo } from "sileo"
import { deleteCombo } from '@/lib/api/comboService';
import type { Combo } from '@/types/combo';

interface DeleteComboDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  combo: Combo | null;
  onDeleted: () => void;
}

/**
 * Diálogo de confirmación para eliminar un combo
 * Sigue las mejores prácticas de UX y accesibilidad
 */
export const DeleteComboDialog: React.FC<DeleteComboDialogProps> = ({
  open,
  onOpenChange,
  combo,
  onDeleted
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!combo) return;

    setIsDeleting(true);
    
    try {
      await deleteCombo(combo.id);
      sileo.success({ title: `Combo "${combo.name}" eliminado exitosamente` });
      onDeleted();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting combo:', error);
      sileo.error({ title: error.message || 'Error al eliminar el combo' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!combo) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Eliminar Combo
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            ¿Estás seguro de que deseas eliminar el combo{' '}
            <span className="font-semibold text-gray-900">"{combo.name}"</span>?
            <br />
            <br />
            Esta acción no se puede deshacer y eliminará permanentemente:
            <ul className="mt-2 ml-4 list-disc text-sm">
              <li>El combo y su configuración</li>
              <li>Todos los productos asociados al combo</li>
              <li>El historial de ventas relacionado</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel 
            disabled={isDeleting}
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Eliminando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Eliminar Combo
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
