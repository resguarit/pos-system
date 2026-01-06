/**
 * Custom Hook for Stock Transfer Logic
 * Supports both Create and Edit modes
 * Separates business logic from UI components
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { stockTransferService } from '@/lib/api/stockTransferService';
import { getBranches } from '@/lib/api/branchService';
import { getProducts } from '@/lib/api/productService';
import { getStockByProductAndBranch } from '@/lib/api/stockService';
import type { Branch, Product, TransferItem, TransferFormData, CreateTransferPayload } from '../types';
import { createTransferSchema, getValidationErrors } from '../schemas';
import { useAuth } from '@/hooks/useAuth';

interface UseStockTransferOptions {
  /** Transfer ID for edit mode. If undefined, creates new transfer */
  transferId?: number;
  preselectedSourceBranchId?: number;
  onSuccess?: () => void;
  onClose?: () => void;
  visibleBranchIds?: string[];
}

interface UseStockTransferReturn {
  // State
  form: TransferFormData;
  items: TransferItem[];
  branches: Branch[];
  products: Product[];
  loading: boolean;
  isSubmitting: boolean;
  isEditMode: boolean;

  // Actions
  setForm: React.Dispatch<React.SetStateAction<TransferFormData>>;
  addItem: (productId: number, quantity: number) => Promise<boolean>;
  removeItem: (index: number) => void;
  updateItemQuantity: (index: number, quantity: number) => void;
  getProductStock: (productId: number) => Promise<number>;
  submit: () => Promise<boolean>;
  reset: () => void;

  // Helpers
  getSourceBranchName: () => string;
  getDestinationBranchName: () => string;
  validateForm: () => { valid: boolean; errors: Record<string, string> };
}

const STORAGE_KEY = 'stock-transfer-draft';

const initialFormState = (preselectedSourceBranchId?: number): TransferFormData => ({
  source_branch_id: preselectedSourceBranchId?.toString() ?? '',
  destination_branch_id: '',
  transfer_date: new Date(),
  notes: '',
});

// Helper to load draft from localStorage (only for create mode)
const loadDraft = (): { form: TransferFormData; items: TransferItem[] } | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.form?.transfer_date) {
        data.form.transfer_date = new Date(data.form.transfer_date);
      }
      return data;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

const saveDraft = (form: TransferFormData, items: TransferItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, items }));
  } catch {
    // Ignore storage errors
  }
};

const clearDraft = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
};

export function useStockTransfer(options: UseStockTransferOptions = {}): UseStockTransferReturn {
  const { transferId, preselectedSourceBranchId, onSuccess, onClose } = options;
  const isEditMode = transferId !== undefined;
  const lastLoadedTransferId = useRef<number | null>(null);
  const { branches: userBranches } = useAuth();

  // Memoize user branch IDs to avoid unnecessary re-renders
  const userBranchIds = useMemo(
    () => userBranches.map(b => Number(b.id)),
    [userBranches]
  );

  // Form state
  const [form, setForm] = useState<TransferFormData>(initialFormState(preselectedSourceBranchId));
  const [items, setItems] = useState<TransferItem[]>([]);

  // Data state
  const [allBranches, setAllBranches] = useState<Branch[]>([]);

  // Computed branches based on visibility filter
  const branches = useMemo(() => {
    const { visibleBranchIds } = options;
    return allBranches.filter(branch => {
      // If no filter provided or empty array, show all (or consistent with "No selection = All" behavior if that's preferred, 
      // but usually "Create" needs strict selection. However, if page says "All" when empty, we should probably follow suit.
      // But safe bet: if visibleBranchIds is undefined, show all. If array, check includes.
      // NOTE: Empty array `[]` generally implies "Show None" in filters, but if global filter is "None Selected", maybe we want to allow user to pick any? 
      // User complaint was "I have 2 selected and nothing appears".
      // Let's ensure we handle the updates.

      if (!visibleBranchIds || visibleBranchIds.length === 0) return true;
      return visibleBranchIds.includes(branch.id.toString());
    });
  }, [allBranches, options]);
  const [products, setProducts] = useState<Product[]>([]);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load draft from localStorage only in create mode on mount
  useEffect(() => {
    if (!isEditMode) {
      const draft = loadDraft();
      if (draft) {
        setForm(draft.form);
        setItems(draft.items);
      }
    }
  }, [isEditMode]);

  // Save to localStorage only in create mode
  useEffect(() => {
    if (!isEditMode && dataLoaded) {
      saveDraft(form, items);
    }
  }, [form, items, isEditMode, dataLoaded]);

  // Load branches and products on mount or when user branch IDs change
  useEffect(() => {
    if (!dataLoaded && userBranchIds.length > 0) {
      loadInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBranchIds.length]);

  // Load transfer data when transferId changes (edit mode)
  useEffect(() => {
    if (isEditMode && transferId && dataLoaded && lastLoadedTransferId.current !== transferId) {
      lastLoadedTransferId.current = transferId;
      loadTransferData(transferId, products);
    }
  }, [transferId, dataLoaded, products, isEditMode]);

  // Update item stocks when source branch changes
  useEffect(() => {
    if (form.source_branch_id && items.length > 0 && dataLoaded) {
      updateAllItemStocks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.source_branch_id, dataLoaded]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [branchesData, productsData] = await Promise.all([
        getBranches(),
        getProducts(),
      ]);

      // Filter only active branches that belong to the user
      const activeBranches = (branchesData as Branch[]).filter(
        branch => {
          const isActive = branch.status === true;
          const userHasAccess = userBranchIds.includes(Number(branch.id));
          return isActive && userHasAccess;
        }
      );

      setAllBranches(activeBranches);
      setProducts(productsData as Product[]);
      setDataLoaded(true);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Error al cargar datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const loadTransferData = async (id: number, productsList: Product[]) => {
    try {
      setLoading(true);
      const transfer = await stockTransferService.getById(id);

      const sourceBranchId = transfer.source_branch_id?.toString() ?? '';

      // Set form data
      setForm({
        source_branch_id: sourceBranchId,
        destination_branch_id: transfer.destination_branch_id?.toString() ?? '',
        transfer_date: transfer.transfer_date ? new Date(transfer.transfer_date) : new Date(),
        notes: transfer.notes ?? '',
      });

      // Set items with product info and fetch stock
      if (transfer.items && Array.isArray(transfer.items)) {
        const transferItems: TransferItem[] = await Promise.all(
          transfer.items.map(async (item: { product_id: number; quantity: number; product?: { id: number; description: string; code?: string; barcode?: string } }) => {
            const product = productsList.find(p =>
              p.id.toString() === item.product_id?.toString()
            );

            // Fetch available stock for this item
            let availableStock = 0;
            if (sourceBranchId) {
              try {
                const stock = await getStockByProductAndBranch(item.product_id, parseInt(sourceBranchId));
                availableStock = stock?.current_stock ?? 0;
              } catch {
                availableStock = 0;
              }
            }

            return {
              product_id: item.product_id,
              quantity: item.quantity,
              availableStock,
              product: product ? {
                id: typeof product.id === 'string' ? parseInt(product.id) : product.id,
                description: product.description,
                code: product.code ?? null,
                barcode: product.barcode ?? null,
              } : item.product,
            };
          })
        );
        setItems(transferItems);
      }
    } catch (error) {
      console.error('Error loading transfer:', error);
      toast.error('Error al cargar la transferencia');
    } finally {
      setLoading(false);
    }
  };

  const updateAllItemStocks = async () => {
    if (!form.source_branch_id) return;

    const updatedItems = await Promise.all(
      items.map(async (item) => {
        const stock = await getProductStock(item.product_id);
        return { ...item, availableStock: stock };
      })
    );
    setItems(updatedItems);
  };

  const getProductStock = useCallback(async (productId: number): Promise<number> => {
    if (!form.source_branch_id) return 0;

    try {
      const stock = await getStockByProductAndBranch(
        productId,
        parseInt(form.source_branch_id)
      );
      return stock?.current_stock ?? 0;
    } catch {
      return 0;
    }
  }, [form.source_branch_id]);

  const addItem = useCallback(async (productId: number, quantity: number): Promise<boolean> => {
    if (!form.source_branch_id) {
      toast.error('Seleccione primero la sucursal de origen');
      return false;
    }

    if (quantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return false;
    }

    const product = products.find(p =>
      (typeof p.id === 'string' ? parseInt(p.id) : p.id) === productId
    );
    if (!product) {
      toast.error('Producto no encontrado');
      return false;
    }

    const availableStock = await getProductStock(productId);
    const existingIndex = items.findIndex(item => item.product_id === productId);

    if (existingIndex !== -1) {
      const currentQty = items[existingIndex].quantity;
      if (currentQty + quantity > availableStock) {
        toast.error(`Stock insuficiente. Disponible: ${availableStock}, Ya agregado: ${currentQty}`);
        return false;
      }

      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: currentQty + quantity,
      };
      setItems(updatedItems);
    } else {
      if (quantity > availableStock) {
        toast.error(`Stock insuficiente. Disponible: ${availableStock}`);
        return false;
      }

      setItems(prev => [...prev, {
        product_id: productId,
        quantity,
        availableStock,
        product: {
          id: typeof product.id === 'string' ? parseInt(product.id) : product.id,
          description: product.description,
          code: product.code ?? null,
          barcode: product.barcode ?? null,
        },
      }]);
    }

    return true;
  }, [form.source_branch_id, products, items, getProductStock]);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateItemQuantity = useCallback((index: number, quantity: number) => {
    if (quantity <= 0) return;

    setItems(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], quantity };
      }
      return updated;
    });
  }, []);

  const validateForm = useCallback((): { valid: boolean; errors: Record<string, string> } => {
    const payload = {
      source_branch_id: parseInt(form.source_branch_id) || 0,
      destination_branch_id: parseInt(form.destination_branch_id) || 0,
      transfer_date: form.transfer_date,
      notes: form.notes || undefined,
      items: items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
    };

    const result = createTransferSchema.safeParse(payload);

    if (result.success) {
      return { valid: true, errors: {} };
    }

    return { valid: false, errors: getValidationErrors(result.error) };
  }, [form, items]);

  const submit = useCallback(async (): Promise<boolean> => {
    const validation = validateForm();

    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || 'Por favor corrija los errores');
      return false;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateTransferPayload = {
        source_branch_id: parseInt(form.source_branch_id),
        destination_branch_id: parseInt(form.destination_branch_id),
        transfer_date: format(form.transfer_date, 'yyyy-MM-dd'),
        notes: form.notes || undefined,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };

      if (isEditMode && transferId) {
        await stockTransferService.update(transferId, payload);
        toast.success('Transferencia actualizada exitosamente');
      } else {
        await stockTransferService.create(payload);
        toast.success('Transferencia creada exitosamente');
        clearDraft();
      }

      onSuccess?.();
      onClose?.();

      return true;
    } catch (error: unknown) {
      console.error('Error saving transfer:', error);
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Error al guardar la transferencia';
      toast.error(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [form, items, validateForm, isEditMode, transferId, onSuccess, onClose]);

  const reset = useCallback(() => {
    setForm(initialFormState(preselectedSourceBranchId));
    setItems([]);
    if (!isEditMode) {
      clearDraft();
    }
  }, [preselectedSourceBranchId, isEditMode]);

  const getSourceBranchName = useCallback((): string => {
    const branch = branches.find(b => b.id.toString() === form.source_branch_id);
    return branch?.description ?? branch?.name ?? '';
  }, [branches, form.source_branch_id]);

  const getDestinationBranchName = useCallback((): string => {
    const branch = branches.find(b => b.id.toString() === form.destination_branch_id);
    return branch?.description ?? branch?.name ?? '';
  }, [branches, form.destination_branch_id]);

  return {
    // State
    form,
    items,
    branches,
    products,
    loading,
    isSubmitting,
    isEditMode,

    // Actions
    setForm,
    addItem,
    removeItem,
    updateItemQuantity,
    getProductStock,
    submit,
    reset,

    // Helpers
    getSourceBranchName,
    getDestinationBranchName,
    validateForm,
  };
}
