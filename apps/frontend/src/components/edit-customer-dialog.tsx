

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { Dispatch, SetStateAction } from 'react';
import { normalizePhone } from "@/lib/formatters/phoneFormatter";

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  customer: Customer | null;
}

export const EditCustomerDialog = ({ open, onOpenChange, customer }: EditCustomerDialogProps) => {
  const [formValues, setFormValues] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    setFormValues({
      name: customer?.name || "",
      email: customer?.email || "",
      phone: normalizePhone(customer?.phone || "")
    });
  }, [customer]);

  const handleChange = (field: "name" | "email" | "phone", value: string) => {
    const nextValue = field === "phone" ? normalizePhone(value) : value;
    setFormValues((prev) => ({ ...prev, [field]: nextValue }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Modifique los datos del cliente y haga clic en guardar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input
              id="name"
              value={formValues.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formValues.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Teléfono
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={formValues.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="col-span-3"
              placeholder="2216720232"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={() => onOpenChange(false)}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
