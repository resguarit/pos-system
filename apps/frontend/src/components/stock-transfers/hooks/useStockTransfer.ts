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
  allBranches: Branch[];
  userBranchIds: number[];
  products: Product[];
  loading: boolean;
  isSubmitting: boolean;
  isEditMode: boolean;

  // Actions
  setForm: React.Dispatch<React.SetStateAction<TransferFormData>>;
  addItem: (productId: number, quantity: number) => Promise<boolean>;
  addItems: (items: { productId: number; quantity: number; productCode?: string; productName?: string; availableStock?: number }[]) => Promise<boolean>;
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
  // This represents "My Context Branches" - the ones I see in the dashboard (or all my allowed ones if no filter)
  const branches = useMemo(() => {
    const { visibleBranchIds } = options;
    return allBranches.filter(branch => {
      // Must be a user branch
      if (!userBranchIds.includes(Number(branch.id))) return false;

      // Must match visibility filter if present
      if (!visibleBranchIds || visibleBranchIds.length === 0) return true;
      return visibleBranchIds.includes(branch.id.toString());
    });
  }, [allBranches, options, userBranchIds]);
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



  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [branchesData, productsData] = await Promise.all([
        getBranches(),
        getProducts(),
      ]);

      // Filter only active branches
      const activeBranches = (branchesData as Branch[]).filter(
        branch => branch.status === true
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
  }, []); // Remove userBranchIds dependency as we want ALL active branches

  // Auto-select destination branch if user has only one available branch
  useEffect(() => {
    if (!dataLoaded || isEditMode) return;

    // We only auto-select if:
    // 1. Destination is empty
    // 2. User has related branches available
    if (!form.destination_branch_id && userBranchIds.length > 0) {
      // Find branches that belong to the user
      const myBranches = allBranches.filter(b => userBranchIds.includes(Number(b.id)));

      // If user has exactly one branch, select it
      if (myBranches.length === 1) {
        setForm(prev => ({
          ...prev,
          destination_branch_id: myBranches[0].id.toString()
        }));
      }
      // If user has multiple branches, but filtered by context (visibleBranchIds) results in 1, select it
      // This helps when user says "I selected one branch in dash, use it"
      else if (options.visibleBranchIds && options.visibleBranchIds.length === 1) {
        setForm(prev => ({
          ...prev,
          destination_branch_id: options.visibleBranchIds![0] // Non-null assertion safe due to length check
        }));
      }
    }
  }, [dataLoaded, isEditMode, form.destination_branch_id, userBranchIds, allBranches, options.visibleBranchIds]);

  const loadTransferData = useCallback(async (id: number, productsList: Product[]) => {
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
  }, []);

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

  const updateAllItemStocks = useCallback(async () => {
    if (!form.source_branch_id) return;

    // Use functional setState to get current items without making items a dependency
    setItems(currentItems => {
      // We need to update asynchronously, but we can't use async inside the updater
      // So we trigger the async update and return currentItems unchanged initially
      return currentItems;
    });

    // Get fresh items via ref pattern - we need to access items for the async operation
    // But to avoid the dependency loop, we'll fetch them inside a separate async function
    const fetchAndUpdateStocks = async () => {
      // We need to get current items state - use a workaround
      let currentItemsSnapshot: TransferItem[] = [];
      setItems(curr => {
        currentItemsSnapshot = curr;
        return curr;
      });

      if (currentItemsSnapshot.length === 0) return;

      const updatedItems = await Promise.all(
        currentItemsSnapshot.map(async (item) => {
          const stock = await getProductStock(item.product_id);
          return { ...item, availableStock: stock };
        })
      );
      setItems(updatedItems);
    };

    fetchAndUpdateStocks();
  }, [form.source_branch_id, getProductStock]);

  // Load branches and products on mount or when user branch IDs change
  useEffect(() => {
    if (!dataLoaded && userBranchIds.length > 0) {
      loadInitialData();
    }
  }, [userBranchIds.length, dataLoaded, loadInitialData]);

  // Load transfer data when transferId changes (edit mode)
  useEffect(() => {
    if (isEditMode && transferId && dataLoaded && lastLoadedTransferId.current !== transferId) {
      lastLoadedTransferId.current = transferId;
      loadTransferData(transferId, products);
    }
  }, [transferId, dataLoaded, products, isEditMode, loadTransferData]);

  // Update item stocks when source branch changes (but not when items change)
  // Using a ref to track the previous source branch ID
  const previousSourceBranchId = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Only update stocks if source branch actually changed (not on every items change)
    if (form.source_branch_id && dataLoaded && previousSourceBranchId.current !== form.source_branch_id) {
      previousSourceBranchId.current = form.source_branch_id;
      updateAllItemStocks();
    }
  }, [form.source_branch_id, dataLoaded, updateAllItemStocks]);

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
    return true;
  }, [form.source_branch_id, products, items, getProductStock]);

  const addItems = useCallback(async (newItems: { productId: number; quantity: number; productCode?: string; productName?: string; availableStock?: number }[]): Promise<boolean> => {
    if (!form.source_branch_id) {
      toast.error('Seleccione primero la sucursal de origen');
      return false;
    }

    if (newItems.length === 0) return false;

    const warnings: string[] = [];

    // Clone current items to avoid mutation during loop
    const currentItemsMap = new Map(items.map(i => [i.product_id, i]));
    const productsMap = new Map(products.map(p => [typeof p.id === 'string' ? parseInt(p.id) : p.id, p]));

    for (const newItem of newItems) {
      // Si tenemos datos del producto pasados directamente, usarlos
      // Si no, buscar en productsMap como fallback
      const productFromMap = productsMap.get(newItem.productId);

      const productName = newItem.productName || productFromMap?.description || `Producto #${newItem.productId}`;
      const productCode = newItem.productCode || productFromMap?.code || null;

      // Obtener stock disponible: usar el pasado, o buscar en la API, o 0 por defecto
      let availableStock = newItem.availableStock;
      if (availableStock === undefined) {
        availableStock = await getProductStock(newItem.productId);
      }

      const existingItem = currentItemsMap.get(newItem.productId);
      let finalQuantity = newItem.quantity;

      if (existingItem) {
        finalQuantity += existingItem.quantity;
      }

      // Advertir si stock es insuficiente pero no bloquear
      if (finalQuantity > availableStock) {
        warnings.push(`${productName}: Stock insuficiente (Necesario: ${finalQuantity}, Disponible: ${availableStock})`);
      }

      const item: TransferItem = {
        product_id: newItem.productId,
        quantity: finalQuantity,
        availableStock,
        product: {
          id: newItem.productId,
          description: productName,
          code: productCode,
          barcode: productFromMap?.barcode ?? null,
        }
      };
      currentItemsMap.set(newItem.productId, item);
    }

    if (warnings.length > 0) {
      toast.warning(`Advertencia de stock:\n${warnings.slice(0, 3).join('\n')}${warnings.length > 3 ? '...' : ''}`, {
        duration: 6000
      });
    }

    setItems(Array.from(currentItemsMap.values()));
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

  const reset = useCallback(() => {
    setForm(initialFormState(preselectedSourceBranchId));
    setItems([]);
    if (!isEditMode) {
      clearDraft();
    }
  }, [preselectedSourceBranchId, isEditMode]);

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
        reset();
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
  }, [form, items, validateForm, isEditMode, transferId, onSuccess, onClose, reset]);



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
    addItems,
    removeItem,
    updateItemQuantity,
    getProductStock,
    submit,
    reset,

    // Helpers
    getSourceBranchName,
    getDestinationBranchName,
    validateForm,
    allBranches,
    userBranchIds, // Export so UI can filter destination options
  };
}
