import api from '../api';

export interface Product {
  id: string;
  name: string;
  description?: string;
  sale_price: number;
  unit_price?: number;
  stock?: number;
  category_id?: string;
  supplier_id?: string;
  sku?: string;
  barcode?: string;
  image?: string;
  status: string;
  currency?: string;
}

export const getProducts = async (params: any = {}): Promise<any> => {
  try {
    const response = await api.get('/products', { params });
    // Manejar la estructura de respuesta de la API
    return response.data.data || response.data;
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
};

export const getProductById = async (id: string): Promise<Product> => {
  try {
    const response = await api.get(`/products/${id}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Failed to fetch product with id ${id}:`, error);
    throw error;
  }
};

export const createProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
  try {
    const response = await api.post('/products', product);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Failed to create product:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, product: Partial<Product>): Promise<Product> => {
  try {
    const response = await api.put(`/products/${id}`, product);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Failed to update product with id ${id}:`, error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    await api.delete(`/products/${id}`);
  } catch (error) {
    console.error(`Failed to delete product with id ${id}:`, error);
    throw error;
  }
};