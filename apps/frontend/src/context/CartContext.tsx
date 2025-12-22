import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { CartItem } from '@/types/combo'

const CART_STORAGE_KEY = 'pos_cart'

interface CartContextType {
    cart: CartItem[]
    addToCart: (product: CartItem, qty?: number) => void
    removeFromCart: (productId: string) => void
    updateQuantity: (productId: string, quantity: number) => void
    clearCart: () => void
    setCart: (cart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void // Allow functional updates
    addMultipleItems: (items: CartItem[]) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
    // Initialize from localStorage
    const [cart, setCartState] = useState<CartItem[]>(() => {
        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY)
            return stored ? JSON.parse(stored) : []
        } catch (e) {
            console.error('Error loading cart from storage', e)
            return []
        }
    })

    // Sync to localStorage whenever cart changes
    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
        } catch (e) {
            console.error('Error saving cart to storage', e)
        }
    }, [cart])

    // Allow functional updates to match useState signature if needed, or just direct array
    const setCart = useCallback((newCart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
        setCartState(newCart)
    }, [])

    const addToCart = useCallback((product: CartItem, qty?: number) => {
        const quantityToAdd = Math.max(1, Number(qty) || 1);

        setCartState((prevCart) => {
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
        setCartState((prevCart) =>
            prevCart.map((item) =>
                item.id === productId
                    ? { ...item, quantity: newQuantity }
                    : item
            )
        );
    }, []);

    const removeFromCart = useCallback((productId: string) => {
        setCartState((prevCart) => prevCart.filter((item) => item.id !== productId));
    }, []);

    const clearCart = useCallback(() => {
        setCartState([]);
    }, []);

    const addMultipleItems = useCallback((items: CartItem[]) => {
        setCartState((prevCart) => {
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

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            setCart,
            addMultipleItems
        }}>
            {children}
        </CartContext.Provider>
    )
}

export const useCartContext = () => {
    const context = useContext(CartContext)
    if (!context) throw new Error('useCartContext must be used within a CartProvider')
    return context
}
