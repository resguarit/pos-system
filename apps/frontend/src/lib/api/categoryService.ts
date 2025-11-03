import api from '../api';

export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  parent: any;
  children: any[];
}


export const getCategories = async (): Promise<Category[]> => {
  try {
    // No enviar limit ni per_page para obtener TODAS las categorías sin paginación
    // Si se envían parámetros vacíos, algunos frameworks pueden omitirlos
    const response = await api.get('/categories');
    
    // La API puede devolver diferentes estructuras dependiendo de los parámetros
    if (response.data?.data?.data) {
      // Estructura paginada
      return response.data.data.data || [];
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      // Estructura simple con data.data
      return response.data.data;
    } else if (response.data && Array.isArray(response.data)) {
      // Estructura muy simple
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};