

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from 'react';
import { createSupplier } from '@/lib/api/supplierService';
import useApi from "@/hooks/useApi";
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export interface NewProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const NewProviderDialog = ({ open, onOpenChange, onSaved }: NewProviderDialogProps) => {
  const { request } = useApi();
  const [form, setForm] = useState({
    name: '',
    contact_name: '', // Renamed from contact_person
    email: '',
    phone: '',
    tax_id: '',
    address: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para validación de duplicados
  const [nameError, setNameError] = useState<string>("");
  const [isCheckingName, setIsCheckingName] = useState<boolean>(false);

  // Función para verificar si el nombre ya existe
  const checkNameExists = async (name: string) => {
    if (!name.trim()) {
      setNameError("");
      return;
    }

    setIsCheckingName(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/suppliers/check-name/${encodeURIComponent(name)}`
      });
      
      if (response.exists) {
        setNameError("Este nombre ya está en uso");
        toast.error("Este nombre ya está en uso", {
          description: "Por favor, elige un nombre diferente para el proveedor."
        });
      } else {
        setNameError("");
      }
    } catch (error) {
      console.error("Error checking name:", error);
      setNameError("");
    } finally {
      setIsCheckingName(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    
    // Validación de duplicados con debounce para el nombre
    if (e.target.name === 'name') {
      const timeoutId = setTimeout(() => {
        checkNameExists(e.target.value);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createSupplier(form);
      onSaved();
      onOpenChange(false);
      setForm({ // Reset form state
        name: '',
        contact_name: '', // Renamed here as well
        email: '',
        phone: '',
        tax_id: '',
        address: '',
        status: 'active',
      });
    } catch (rawError: any) {
      let displayError = 'Error al crear proveedor. Intente nuevamente.';
      try {
        const errorSource = typeof rawError === 'string' ? rawError : rawError.message;
        if (errorSource && typeof errorSource === 'string') {
          const parsedError = JSON.parse(errorSource);
          if (parsedError.message) {
            displayError = parsedError.message;
          }
        } else if (rawError.response && rawError.response.data && rawError.response.data.message) {
          displayError = rawError.response.data.message;
        } else if (rawError.message && typeof rawError.message === 'string') {
            displayError = rawError.message;
        }
      } catch (e) {
        // If parsing or access fails, use a generic or already set message
      }
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Nuevo Proveedor</DialogTitle>
          <DialogDescription>
            Completa los campos para agregar un nuevo proveedor.
          </DialogDescription>
        </DialogHeader>
        <form id="provider-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-hide grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nombre o Empresa</Label>
            <div className="col-span-3 relative">
              <Input 
                id="name" 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                className={nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2' : ''}
                style={{ borderColor: nameError ? '#ef4444' : undefined }}
                required 
              />
              {isCheckingName && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contact_name" className="text-right">Contacto</Label>
            <Input id="contact_name" name="contact_name" value={form.contact_name} onChange={handleChange} className="col-span-3" required /> 
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Teléfono</Label>
            <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tax_id" className="text-right">CUIT</Label>
            <Input id="tax_id" name="tax_id" value={form.tax_id} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">Dirección</Label>
            <Input id="address" name="address" value={form.address} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Estado</Label>
            <select id="status" name="status" className="col-span-3" value={form.status} onChange={handleChange}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="pending">En revisión</option>
            </select>
          </div>
          {error && <div className="col-span-4 text-red-500 text-sm">{error}</div>}
        </form>
        
        <DialogFooter className="flex-shrink-0">
          <Button type="submit" form="provider-form" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewProviderDialog;
