
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { Dispatch, SetStateAction } from 'react';
import { useState } from "react";
import useApi from "@/hooks/useApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  person?: {
    first_name: string;
    last_name: string;
  }
}

interface NewCustomerDialogProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  onSuccess?: (customer: Customer) => void;
}

export interface NewCustomerFormContentProps {
  onSuccess?: (customer: Customer) => void;
  onCancel: () => void;
}

export function NewCustomerFormContent({ onSuccess, onCancel }: NewCustomerFormContentProps) {
  const { request } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    cuit: "",
    fiscal_condition_id: "1", // Consumidor Final
    person_type_id: "1", // Persona Física
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name) {
      toast.error("Error", { description: "Nombre y Apellido son obligatorios" });
      return;
    }

    setIsLoading(true);
    try {
      const customerData = {
        ...formData,
        active: true,
        fiscal_condition_id: parseInt(formData.fiscal_condition_id),
        person_type_id: parseInt(formData.person_type_id),
      };

      const response = await request({
        method: "POST",
        url: "/customers",
        data: customerData,
      });

      if (response && response.success) {
        toast.success("Cliente creado correctamente");
        if (onSuccess) {
          onSuccess(response.data);
        }
      } else {
        toast.error("Error al crear cliente", { description: response?.message || "Ocurrió un error desconocido" });
      }
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast.error("Error al crear cliente", { description: error.message || "Ocurrió un error desconocido" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold leading-none tracking-tight">Nuevo Cliente (Rápido)</h3>
        <p className="text-sm text-muted-foreground">
          Complete los datos básicos del cliente. Para más opciones, use el módulo de Clientes.
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre *</Label>
              <Input id="first_name" value={formData.first_name} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido *</Label>
              <Input id="last_name" value={formData.last_name} onChange={handleInputChange} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={formData.phone} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={formData.address} onChange={handleInputChange} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}

const NewCustomerDialog = ({ open, onOpenChange, onSuccess }: NewCustomerDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <NewCustomerFormContent
          onSuccess={(customer) => {
            if (onSuccess) onSuccess(customer);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

export default NewCustomerDialog;
