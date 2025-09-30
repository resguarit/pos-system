import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface Branch {
  name: string;
  address: string;
  phone: string;
  estado: string;
}

interface NewBranchDialogProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

const NewBranchDialog = ({ open, onOpenChange }: NewBranchDialogProps) => {
  const [newBranch, setNewBranch] = useState<Branch>({
    name: '',
    address: '',
    phone: '',
    estado: 'Activo',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nueva Sucursal</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nombre</Label>
            <Input id="name" value={newBranch.name} onChange={(e) => setNewBranch({...newBranch, name: e.target.value})} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">Dirección</Label>
            <Input id="address" value={newBranch.address} onChange={(e) => setNewBranch({...newBranch, address: e.target.value})} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Teléfono</Label>
            <Input id="phone" value={newBranch.phone} onChange={(e) => setNewBranch({...newBranch, phone: e.target.value})} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="estado" className="text-right">Estado</Label>
            <select id="estado" className="col-span-3" value={newBranch.estado} onChange={(e) => setNewBranch({...newBranch, estado: e.target.value})}>
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

export default NewBranchDialog;
