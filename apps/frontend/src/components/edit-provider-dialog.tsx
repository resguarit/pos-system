import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSupplier, updateSupplier } from '@/lib/api/supplierService'
import type { Supplier } from '@/types/product';
import { useFormSubmit } from '@/hooks/useFormSubmit'
import useApi from "@/hooks/useApi";
import { toast } from 'sonner';

interface EditProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: Supplier | null
  onSaved?: () => void
}

export default function EditProviderDialog({ open, onOpenChange, supplier, onSaved }: EditProviderDialogProps) {
  const { request } = useApi();
  const [form, setForm] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    cuit: '',
    address: '',
    status: 'active'
  })
  
  // Estados para validación de duplicados
  const [nameError, setNameError] = useState<string>("")
  const [isCheckingName, setIsCheckingName] = useState<boolean>(false)
  
  const { isSubmitting, handleSubmit } = useFormSubmit({
    successMessage: supplier?.id ? 'Proveedor actualizado' : 'Proveedor creado',
    errorMessage: 'Error al guardar el proveedor',
    onSuccess: () => {
      onSaved?.()
      onOpenChange(false)
    }
  })

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || '',
        contact_name: supplier.contact_name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        cuit: supplier.cuit || '',
        address: supplier.address || '',
        status: supplier.status || 'active'
      })
    } else {
      setForm({ name: '', contact_name: '', phone: '', email: '', cuit: '', address: '', status: 'active' })
    }
  }, [supplier, open])

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
      
      if (response.exists && name !== (supplier?.name || '')) {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    
    // Validación de duplicados con debounce para el nombre
    if (name === 'name') {
      const timeoutId = setTimeout(() => {
        checkNameExists(value);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }

  const onSubmit = async () => {
    await handleSubmit(async () => {
      if (supplier?.id) {
        await updateSupplier(supplier.id, form)
      } else {
        await createSupplier(form as any)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-hide grid gap-4 py-4">
          <div className="relative">
            <Input 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              placeholder="Nombre" 
              disabled={isSubmitting}
              className={nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2' : ''}
              style={{ borderColor: nameError ? '#ef4444' : undefined }}
            />
            {isCheckingName && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              </div>
            )}
          </div>
          <Input name="contact_name" value={form.contact_name} onChange={handleChange} placeholder="Contacto" disabled={isSubmitting} />
          <Input name="phone" value={form.phone} onChange={handleChange} placeholder="Teléfono" disabled={isSubmitting} />
          <Input name="email" value={form.email} onChange={handleChange} placeholder="Email" disabled={isSubmitting} />
          <Input name="cuit" value={form.cuit} onChange={handleChange} placeholder="CUIT" disabled={isSubmitting} />
          <Input name="address" value={form.address} onChange={handleChange} placeholder="Dirección" disabled={isSubmitting} />
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
