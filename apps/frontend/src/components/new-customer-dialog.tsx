
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from "react";
import useApi from "@/hooks/useApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { normalizePhone } from "@/lib/formatters/phoneFormatter";
import { useFiscalConditions } from "@/hooks/useFiscalConditions";

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
  const { fiscalConditions } = useFiscalConditions();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    cuit: "",
    fiscal_condition_id: "",
    person_type_id: "1", // Persona Física
  });

  // Resolver dinámicamente el ID de Consumidor Final por AFIP code
  useEffect(() => {
    if (fiscalConditions.length > 0 && !formData.fiscal_condition_id) {
      const cf = fiscalConditions.find(fc => fc.afip_code === '5' || fc.name.toLowerCase().includes('consumidor final'));
      if (cf) {
        setFormData(prev => ({ ...prev, fiscal_condition_id: String(cf.id) }));
      }
    }
  }, [fiscalConditions, formData.fiscal_condition_id]);
  const [nameError, setNameError] = useState("");
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    if (!firstName || !lastName) {
      setNameError("");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void checkNameExists(firstName, lastName);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [formData.first_name, formData.last_name]);

  const checkNameExists = async (firstName: string, lastName: string) => {
    if (!firstName.trim() || !lastName.trim()) {
      setNameError("");
      return;
    }

    setIsCheckingName(true);
    try {
      const response = await request({
        method: "GET",
        url: `/customers/check-name/${encodeURIComponent(firstName)}/${encodeURIComponent(lastName)}`,
      });

      if (response?.exists) {
        setNameError("Esta combinacion de nombre y apellido ya existe");
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const nextValue = id === "phone" ? normalizePhone(value) : value;
    setFormData(prev => ({ ...prev, [id]: nextValue }));
    if (id === "email") {
      setEmailError("");
    }
    if (id === "phone") {
      setPhoneError("");
    }
    if (id === "first_name" || id === "last_name") {
      setNameError("");
    }
  };

  const getEmailDuplicateMessage = (error: any) => {
    const rawErrors = error?.response?.data?.errors?.email;
    const normalized = Array.isArray(rawErrors) ? rawErrors[0] : rawErrors;
    if (typeof normalized === "string" && normalized.trim()) {
      return normalized;
    }

    const message = error?.response?.data?.message || error?.message;
    if (!message) return null;

    const duplicatePattern = /email|mail/i;
    const conflictPattern = /ya existe|ya esta en uso|already|taken|duplicad/i;
    if (duplicatePattern.test(message) && conflictPattern.test(message)) {
      return "Ese email ya esta registrado. Usa otro o deja el campo vacio.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name) {
      toast.error("Error", { description: "Nombre y Apellido son obligatorios" });
      return;
    }

    if (isCheckingName) {
      toast.error("Espera un momento", { description: "Estamos verificando el nombre y apellido." });
      return;
    }

    if (nameError) {
      toast.error("Cliente duplicado", { description: nameError });
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
      const nameMessage = Array.isArray(error?.response?.data?.errors?.first_name)
        ? error.response.data.errors.first_name[0]
        : error?.response?.data?.errors?.first_name;
      const phoneMessage = Array.isArray(error?.response?.data?.errors?.phone)
        ? error.response.data.errors.phone[0]
        : error?.response?.data?.errors?.phone;
      const emailDuplicateMessage = getEmailDuplicateMessage(error);
      if (typeof nameMessage === "string" && nameMessage.trim()) {
        setNameError(nameMessage);
      }
      if (typeof phoneMessage === "string" && phoneMessage.trim()) {
        setPhoneError(phoneMessage);
      }
      if (emailDuplicateMessage) {
        setEmailError(emailDuplicateMessage);
        toast.error("Email duplicado", { description: emailDuplicateMessage });
      } else if (typeof phoneMessage === "string" && phoneMessage.trim()) {
        toast.error("Telefono duplicado", { description: phoneMessage });
      } else if (typeof nameMessage === "string" && nameMessage.trim()) {
        toast.error("Cliente duplicado", { description: nameMessage });
      } else {
        toast.error("Error al crear cliente", { description: error.message || "Ocurrio un error desconocido" });
      }
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
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                className={nameError ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2" : ""}
                style={{ borderColor: nameError ? "#ef4444" : undefined }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                className={nameError ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2" : ""}
                style={{ borderColor: nameError ? "#ef4444" : undefined }}
              />
            </div>
          </div>
          {nameError && (
            <p className="text-xs text-red-500">{nameError}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="2216720232"
              className={phoneError ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2" : ""}
              style={{ borderColor: phoneError ? "#ef4444" : undefined }}
            />
            {phoneError && (
              <p className="text-xs text-red-500">{phoneError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className={emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2" : ""}
              style={{ borderColor: emailError ? "#ef4444" : undefined }}
            />
            {emailError && (
              <p className="text-xs text-red-500">{emailError}</p>
            )}
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
