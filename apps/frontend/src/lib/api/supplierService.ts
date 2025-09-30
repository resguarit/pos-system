import api from '../api';
import type { Supplier } from '@/types/product';

export type CreateSupplier = {
  name: string;
  contact_name?: string | null;
  phone?: string;
  email?: string;
  cuit?: string;
  address?: string;
  status?: string;
};

export type { Supplier };

/**
 * Obtiene la lista completa de proveedores desde el backend.
 * Al usar 'api.get', nos aseguramos de que el interceptor se ejecute
 * y añada automáticamente el encabezado de autorización (Bearer token).
 */
export const getSuppliers = async (): Promise<Supplier[]> => {
  try {
    const response = await api.get('/suppliers');
    return response.data.data || response.data;
  } catch (error) {
    console.error("Falló la obtención de proveedores:", error);
    throw error;
  }
};

/**
 * Crea un nuevo proveedor en la base de datos.
 * @param supplierData Los datos del proveedor a crear.
 */
export const createSupplier = async (supplierData: CreateSupplier): Promise<Supplier> => {
  try {
    const response = await api.post('/suppliers', supplierData);
    return response.data.data || response.data;
  } catch (error) {
    console.error("Falló la creación del proveedor:", error);
    throw error;
  }
};

/**
 * Obtiene un proveedor específico por su ID.
 * @param id El ID del proveedor a obtener.
 */
export const getSupplierById = async (id: number): Promise<Supplier> => {
  try {
    const response = await api.get(`/suppliers/${id}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Falló la obtención del proveedor con ID ${id}:`, error);
    throw error;
  }
};

/**
 * Actualiza un proveedor existente.
 * @param id El ID del proveedor a actualizar.
 * @param supplierData Los nuevos datos para el proveedor.
 */
export const updateSupplier = async (
  id: number,
  supplierData: Partial<CreateSupplier>
): Promise<Supplier> => {
  try {
    const response = await api.put(`/suppliers/${id}`, supplierData);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Falló la actualización del proveedor con ID ${id}:`, error);
    throw error;
  }
};

/**
 * Elimina un proveedor.
 * @param id El ID del proveedor a eliminar.
 */
export const deleteSupplier = async (id: number): Promise<void> => {
  try {
    await api.delete(`/suppliers/${id}`);
  } catch (error) {
    console.error(`Falló la eliminación del proveedor con ID ${id}:`, error);
    throw error;
  }
};