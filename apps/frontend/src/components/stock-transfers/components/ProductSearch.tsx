/**
 * ProductSearch Component
 * Autocomplete search for products with stock display
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import type { Product } from '../types';

interface ProductSearchProps {
  products: Product[];
  sourceBranchId: string;
  onAddItem: (productId: number, quantity: number) => Promise<boolean>;
  getProductStock: (productId: number) => Promise<number>;
  disabled?: boolean;
}

export function ProductSearch({
  products,
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
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter products based on search
  const filteredProducts = search.trim()
    ? products.filter(p =>
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.code?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 50)
    : products.slice(0, 50);

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
    <div className="space-y-2" ref={containerRef}>
      <div className="flex flex-col md:flex-row gap-2">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Input
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
              setSelectedProductId(null);
              setSelectedProductStock(null);
            }}
            onFocus={() => setShowDropdown(true)}
            disabled={disabled}
          />
          
          {/* Dropdown */}
          {showDropdown && filteredProducts.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-md max-h-60 overflow-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="px-4 py-2 hover:bg-accent cursor-pointer"
                  onClick={() => handleProductSelect(product)}
                >
                  <div className="font-medium">{product.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {product.code || product.barcode || '-'}
                  </div>
                </div>
              ))}
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
            className="w-20"
            min="1"
            disabled={disabled || !selectedProductId}
          />

          <Button
            type="button"
            onClick={handleAdd}
            variant="outline"
            size="icon"
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
      {selectedProductId && selectedProductStock !== null && (
        <p className="text-xs text-blue-600/70 pl-1">
          {loadingStock ? "Verificando stock..." : `Stock disponible en origen: ${selectedProductStock} unidades`}
        </p>
      )}
    </div>
  );
}
