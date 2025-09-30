import api from '../api';
import type { Branch } from '@/types/branch'

export type { Branch }

export const getBranches = async (): Promise<Branch[]> => {
  try {
    const response = await api.get('/branches');
    // Always return an array
    if (Array.isArray(response.data)) {
      return response.data as Branch[];
    } else if (response.data && Array.isArray(response.data.data)) {
      return response.data.data as Branch[];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch branches:', error);
    return [];
  }
};

export const getBranchById = async (id: string): Promise<Branch> => {
  try {
    const response = await api.get(`/branches/${id}`);
    return (response.data.data || response.data) as Branch;
  } catch (error) {
    console.error(`Failed to fetch branch with id ${id}:`, error);
    throw error;
  }
};

export const createBranch = async (branch: Omit<Branch, 'id'>): Promise<Branch> => {
  try {
    const response = await api.post('/branches', branch);
    return (response.data.data || response.data) as Branch;
  } catch (error) {
    console.error('Failed to create branch:', error);
    throw error;
  }
};

export const updateBranch = async (id: string, branch: Partial<Branch>): Promise<Branch> => {
  try {
    const response = await api.put(`/branches/${id}`, branch);
    return (response.data.data || response.data) as Branch;
  } catch (error) {
    console.error(`Failed to update branch with id ${id}:`, error);
    throw error;
  }
};

export const deleteBranch = async (id: string): Promise<void> => {
  try {
    await api.delete(`/branches/${id}`);
  } catch (error) {
    console.error(`Failed to delete branch with id ${id}:`, error);
    throw error;
  }
};

export const getActiveBranches = async (): Promise<Branch[]> => {
  try {
    const response = await api.get('/branches/active');
    return (response.data.data || response.data) as Branch[];
  } catch (error) {
    console.error('Failed to fetch active branches:', error);
    throw error;
  }
};