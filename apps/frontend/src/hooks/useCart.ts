import { useState, useCallback } from 'react';

export interface CartItem {
  id: string;
  code: string;
  name: string;
  price: number;
  price_with_iva: number;
  sale_price: number;
  iva_rate: number;
  quantity: number;
  image: string;
  currency: string;
  iva?: { id: number; rate: number; };
  allow_discount?: boolean;
  discount_type?: 'percent' | 'amount';
  discount_value?: number;
  is_combo?: boolean;
  combo_id?: number;
  combo_details?: any;
  is_from_combo?: boolean;
  combo_name?: string;
  original_combo_price?: number;
  combo_discount_applied?: number;
}

/**
 * Hook personalizado para manejar la lógica del carrito
 * Aplica principios SOLID:
 * - SRP: Solo maneja operaciones del carrito
 * - OCP: Extensible para nuevas funcionalidades
 * - DIP: Depende de abstracciones (callbacks)
 */
export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: CartItem, qty?: number) => {
    const quantityToAdd = Math.max(1, Number(qty) || 1);
    
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + quantityToAdd } 
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity: quantityToAdd }];
      }
    });
  }, []);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart((prevCart) => 
      prevCart.map((item) => 
        item.id === productId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const addMultipleItems = useCallback((items: CartItem[]) => {
    setCart((prevCart) => {
      let newCart = [...prevCart];
      
      items.forEach((item) => {
        const existingItem = newCart.find((cartItem) => cartItem.id === item.id);
        if (existingItem) {
          newCart = newCart.map((cartItem) =>
            cartItem.id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
              : cartItem
          );
        } else {
          newCart.push(item);
        }
      });
      
      return newCart;
    });
  }, []);

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    addMultipleItems,
    setCart
  };
};
