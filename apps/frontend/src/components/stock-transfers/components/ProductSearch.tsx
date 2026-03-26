/**
 * ProductSearch Component
 * Server-side autocomplete search for products with stock display
 * Uses debounced API calls instead of client-side filtering
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Search } from 'lucide-react';
import { getProducts } from '@/lib/api/productService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePosCategories } from '@/hooks/usePosCategories';
import type { Product } from '../types';

interface ProductSearchProps {
  sourceBranchId: string;
  onAddItem: (productId: number, quantity: number) => Promise<boolean>;
  getProductStock: (productId: number) => Promise<number>;
  disabled?: boolean;
}

export function ProductSearch({
  sourceBranchId,
  onAddItem,
  getProductStock,
  disabled = false,
}: ProductSearchProps) {
  const [search, setSearch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProductStock, setSelectedProductStock] = useState<number | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [adding, setAdding] = useState(false);

  // Category hooks
  const {
    parentCategories,
    subcategories,
    selectedCategoryId,
    selectedSubcategoryId,
    loadingSubcategories,
    setSelectedCategoryId,
    setSelectedSubcategoryId,
    filterCategoryIds,
  } = usePosCategories();

  // Server-side search state
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch products from API with search term and category filters
  const fetchProducts = useCallback(async (term: string, currentCategoryIds: number[] | null) => {
    setIsSearching(true);
    try {
      const params: Record<string, string | number | number[]> = {
        per_page: 100,
        status: 'active',
        include: 'category',
      };
      
      if (term.trim()) {
        params.search = term.trim();
      }

      if (currentCategoryIds && currentCategoryIds.length > 0) {
        params.category_ids = currentCategoryIds;
      }

      const data = await getProducts(params);
      // data can be an array or paginated object with .data
      const products = Array.isArray(data) ? data : (data.data || []);
      setSearchResults(products);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search - triggers API call 300ms after user stops typing or category changes
  useEffect(() => {
    if (!showDropdown) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchProducts(search, filterCategoryIds);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [search, showDropdown, fetchProducts, filterCategoryIds]);

  // Reload initial results when category filter changes
  useEffect(() => {
    if (showDropdown) {
      fetchProducts(search, filterCategoryIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategoryIds]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load stock when product is selected
  const handleProductSelect = useCallback(async (product: Product) => {
    const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;
    setSelectedProductId(productId);
    setSearch(product.description);
    setShowDropdown(false);

    if (sourceBranchId) {
      setLoadingStock(true);
      try {
        const stock = await getProductStock(productId);
        setSelectedProductStock(stock);
      } catch {
        setSelectedProductStock(0);
      } finally {
        setLoadingStock(false);
      }
    }
  }, [sourceBranchId, getProductStock]);

  // Handle add item
  const handleAdd = async () => {
    if (!selectedProductId || !quantity) return;

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) return;

    setAdding(true);
    const success = await onAddItem(selectedProductId, qty);
    setAdding(false);

    if (success) {
      setSearch('');
      setQuantity('');
      setSelectedProductId(null);
      setSelectedProductStock(null);
    }
  };

  // Handle Enter key in quantity input
  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Category Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Select 
          value={selectedCategoryId} 
          onValueChange={(val) => {
            setSelectedCategoryId(val);
            setShowDropdown(true);
          }} 
          disabled={disabled}
        >
          <SelectTrigger className="w-full md:w-[250px] bg-white">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">Todas las categorías</SelectItem>
            {parentCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={selectedSubcategoryId} 
          onValueChange={(val) => {
            setSelectedSubcategoryId(val);
            setShowDropdown(true);
          }} 
          disabled={disabled || selectedCategoryId === 'all' || loadingSubcategories}
        >
          <SelectTrigger className="w-full md:w-[250px] bg-white">
            <SelectValue placeholder="Todas las subcategorías" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">Todas las subcategorías</SelectItem>
            {subcategories.map((sub) => (
              <SelectItem key={sub.id} value={sub.id.toString()}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
                setSelectedProductId(null);
                setSelectedProductStock(null);
              }}
              onFocus={() => {
                setShowDropdown(true);
                // Load initial results when focusing with empty search
                if (searchResults.length === 0) {
                  fetchProducts(search, filterCategoryIds);
                }
              }}
              disabled={disabled}
              className="pl-9 bg-white"
            />
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-md max-h-60 overflow-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Buscando...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="px-4 py-2 hover:bg-accent cursor-pointer border-b last:border-0"
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="font-medium text-sm">{product.description}</div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded mr-2">
                        {product.code || product.barcode || '-'}
                      </span>
                      {product.category && (
                        <span className="text-blue-600 truncate">{product.category.name}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-4 text-sm text-muted-foreground text-center">
                  {search.trim() ? 'No se encontraron productos' : 'Escriba para buscar productos'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder="Cant."
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={handleQuantityKeyDown}
            className="w-20 bg-white"
            min="1"
            disabled={disabled || !selectedProductId}
          />

          <Button
            type="button"
            onClick={handleAdd}
            variant="default"
            size="icon"
            className="shrink-0 transition-all hover:scale-105"
            disabled={disabled || adding || !selectedProductId || !quantity}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Stock info - shown below when product selected */}
      <div className="h-5">
        {selectedProductId && selectedProductStock !== null && (
          <p className="text-sm font-medium text-blue-600 flex items-center gap-1.5 pl-1 fade-in-0 animate-in slide-in-from-left-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {loadingStock ? "Verificando stock..." : `Stock disponible en origen: ${selectedProductStock} unidades`}
          </p>
        )}
      </div>
    </div>
  );
}

