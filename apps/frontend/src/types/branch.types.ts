/**
 * Tipos de datos relacionados con sucursales
 */

export interface Branch {
  id: number;
  description: string;
  address: string;
  phone?: string;
  email?: string;
  manager_id?: number | null;
  status: number | boolean;
  point_of_sale?: number;
  color?: string;
  cuit?: string;
  razon_social?: string;
  enabled_receipt_types?: number[];
  afip_active?: boolean;
  [key: string]: any; // Para campos adicionales
}

/**
 * Tipo ligero compatible con BranchContext
 */
export type BranchLike = {
  id: string | number;
  description: string;
  cuit?: string;
  enabled_receipt_types?: number[];
  [key: string]: any;
};
