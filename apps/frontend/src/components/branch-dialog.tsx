import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  estado: string;
}

interface BranchDialogProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  branch?: Branch;
}

const BranchDialog = ({ open, onOpenChange, branch }: BranchDialogProps) => {
  const [editedBranch, setBranch] = useState<Branch>(branch || {
    id: '',
    name: '',
    address: '',
    phone: '',
    estado: 'Activo',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{branch ? 'Editar Sucursal' : 'Nueva Sucursal'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nombre</Label>
            <Input id="name" value={editedBranch.name} onChange={(e) => setBranch({...editedBranch, name: e.target.value})} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">Dirección</Label>
            <Input id="address" value={editedBranch.address} onChange={(e) => setBranch({...editedBranch, address: e.target.value})} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Teléfono</Label>
            <Input id="phone" value={editedBranch.phone} onChange={(e) => setBranch({...editedBranch, phone: e.target.value})} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="estado" className="text-right">Estado</Label>
            <select id="estado" className="col-span-3" value={editedBranch.estado} onChange={(e) => setBranch({...editedBranch, estado: e.target.value})}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="En revisión">En revisión</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {

            onOpenChange(false);
          }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BranchDialog;
