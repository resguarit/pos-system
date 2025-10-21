// lib/api/comboService.ts
import type { 
  Combo, 
  ComboPriceCalculation, 
  ComboAvailability, 
  CreateComboRequest,
  UpdateComboRequest 
} from '@/types/combo';

// Funciones de servicio que NO usan hooks - para uso en componentes
export const comboService = {
  // Obtener todos los combos
  async getAll(): Promise<Combo[]> {
    return getAllCombos();
  },

  // Obtener combos disponibles en una sucursal
  async getAvailableInBranch(branchId: number): Promise<Combo[]> {
    return getAvailableCombosInBranch(branchId);
  },

  // Obtener un combo específico
  async getById(id: number): Promise<Combo> {
    return getComboById(id);
  },

  // Crear un nuevo combo
  async create(data: CreateComboRequest): Promise<Combo> {
    return createCombo(data);
  },

  // Actualizar un combo
  async update(id: number, data: UpdateComboRequest): Promise<Combo> {
    return updateCombo(id, data);
  },

  // Eliminar un combo
  async delete(id: number): Promise<void> {
    return deleteCombo(id);
  },

  // Calcular precio de un combo
  async calculatePrice(id: number): Promise<ComboPriceCalculation> {
    return calculateComboPrice(id);
  },

  // Verificar disponibilidad de un combo
  async checkAvailability(
    id: number, 
    branchId: number, 
    quantity: number = 1
  ): Promise<ComboAvailability> {
    return checkComboAvailability(id, branchId, quantity);
  },
};

import { apiUrl } from './config';
import { getAuthToken } from '../auth';

// Funciones específicas para el hook useCombosInPOS (sin hooks)
export const getAllCombos = async (): Promise<Combo[]> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${apiUrl}/combos`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : data?.data || [];
  } catch (error) {
    console.error('Error fetching all combos:', error);
    throw error;
  }
};

export const getComboById = async (id: number): Promise<Combo> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${apiUrl}/combos/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data?.data || data;
  } catch (error) {
    console.error('Error fetching combo by id:', error);
    throw error;
  }
};

export const createCombo = async (data: CreateComboRequest): Promise<Combo> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${apiUrl}/combos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      // Manejar errores de validación específicos
      if (response.status === 422) {
        const errorData = await response.json();
        if (errorData.errors?.name?.includes('unique')) {
          throw new Error('Ya existe un combo con este nombre. Por favor, elige otro nombre.');
        } else if (errorData.errors) {
          const errorMessages = Object.values(errorData.errors).flat();
          throw new Error(`Error de validación: ${errorMessages.join(', ')}`);
        } else {
          throw new Error(errorData.message || 'Error de validación');
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result?.data || result;
  } catch (error) {
    console.error('Error creating combo:', error);
    throw error;
  }
};

export const updateCombo = async (id: number, data: UpdateComboRequest): Promise<Combo> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${apiUrl}/combos/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result?.data || result;
  } catch (error) {
    console.error('Error updating combo:', error);
    throw error;
  }
};

export const deleteCombo = async (id: number): Promise<void> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${apiUrl}/combos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting combo:', error);
    throw error;
  }
};

export const calculateComboPrice = async (id: number): Promise<ComboPriceCalculation> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${apiUrl}/combos/${id}/calculate-price`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data?.data || data;
  } catch (error) {
    console.error('Error calculating combo price:', error);
    throw error;
  }
};

export const checkComboAvailability = async (
  id: number, 
  branchId: number, 
  quantity: number = 1
): Promise<ComboAvailability> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${apiUrl}/combos/${id}/check-availability`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ branch_id: branchId, quantity }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data?.data || data;
  } catch (error) {
    console.error('Error checking combo availability:', error);
    throw error;
  }
};

export const getAvailableCombosInBranch = async (branchId: number): Promise<Combo[]> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${apiUrl}/combos/available-in-branch?branch_id=${branchId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : data?.data || [];
  } catch (error) {
    console.error('Error fetching available combos in branch:', error);
    throw error;
  }
};

export default comboService;
