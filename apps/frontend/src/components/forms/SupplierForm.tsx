import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { createSupplier } from '@/lib/api/supplierService'; // Asegúrate de que este servicio exista

// Esquema de validación con Zod
const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  contact_name: z.string().optional(),
  email: z.string().email({ message: "Por favor, introduce un email válido." }),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof formSchema>;

interface SupplierFormProps {
  onSuccess: () => void;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ onSuccess }) => {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const onSubmit = async (data: SupplierFormValues) => {
    try {
      await createSupplier(data);
      toast.success('Proveedor creado con éxito!');
      onSuccess(); // Llama a la función onSuccess para refrescar la lista y cerrar el modal
    } catch (error) {
      console.error('Failed to create supplier:', error);
      toast.error('Error al crear el proveedor.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Proveedor</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Proveedor S.A." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="contacto@proveedor.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contact_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Contacto (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Juan Pérez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="11-2233-4455" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton 
          isLoading={form.formState.isSubmitting}
          loadingText="Guardando..."
        >
          Guardar Proveedor
        </SubmitButton>
      </form>
    </Form>
  );
};

export default SupplierForm;