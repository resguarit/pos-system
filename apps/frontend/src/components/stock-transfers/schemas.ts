/**
 * Stock Transfer Validation Schemas
 * Using Zod for runtime validation
 */

import { z } from 'zod';

// Schema for a single transfer item
export const transferItemSchema = z.object({
  product_id: z.number().positive('El ID del producto debe ser positivo'),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
});

// Schema for creating a stock transfer
export const createTransferSchema = z.object({
  source_branch_id: z
    .number()
    .positive('Debe seleccionar la sucursal de origen'),
  destination_branch_id: z
    .number()
    .positive('Debe seleccionar la sucursal de destino'),
  transfer_date: z.date({
    required_error: 'La fecha es requerida',
  }),
  notes: z
    .string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .optional()
    .nullable(),
  items: z
    .array(transferItemSchema)
    .min(1, 'Debe agregar al menos un producto'),
}).refine(
  (data) => data.source_branch_id !== data.destination_branch_id,
  {
    message: 'Las sucursales de origen y destino deben ser diferentes',
    path: ['destination_branch_id'],
  }
);

// Schema for updating a stock transfer
export const updateTransferSchema = z.object({
  source_branch_id: z.number().positive().optional(),
  destination_branch_id: z.number().positive().optional(),
  transfer_date: z.date().optional(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(transferItemSchema).min(1).optional(),
});

// Schema for adding a new item
export const newItemSchema = z.object({
  product_id: z.string().min(1, 'Seleccione un producto'),
  quantity: z.string().min(1, 'Ingrese la cantidad'),
});

// Types derived from schemas
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type UpdateTransferInput = z.infer<typeof updateTransferSchema>;
export type TransferItemInput = z.infer<typeof transferItemSchema>;
export type NewItemInput = z.infer<typeof newItemSchema>;

// Validation helper
export function validateTransfer(data: unknown): {
  success: boolean;
  data?: CreateTransferInput;
  errors?: z.ZodError
} {
  const result = createTransferSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

// Get validation error messages
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }
  return errors;
}
