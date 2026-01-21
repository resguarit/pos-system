
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { PurchaseOrderItem } from '@/lib/api/purchaseOrderService';
import { PurchaseOrderPaymentState } from '@/components/purchase-order-payment-section';

// Define types locally to avoid circular dependencies if possible, or import if they are shared types
// Importing Product from a central place or redefining a minimal version
interface Product {
    id: number;
    description: string;
    code: string;
    unit_price: number;
    currency?: string;
    supplier_id?: number | string;
}

export interface NewPurchaseOrderState {
    form: {
        supplier_id: string;
        branch_id: string;
        order_date: Date;
        notes: string;
    };
    selectedCurrency: 'ARS' | 'USD' | '';
    items: (PurchaseOrderItem & { product?: Product })[];
    newItem: {
        product_id: string;
        quantity: string;
        purchase_price: string;
    };
    payments: PurchaseOrderPaymentState[];
    affectsCashRegister: boolean;
}

interface NewPurchaseOrderContextType {
    state: NewPurchaseOrderState;
    setForm: (form: NewPurchaseOrderState['form']) => void;
    setSelectedCurrency: (currency: 'ARS' | 'USD' | '') => void;
    setItems: (items: NewPurchaseOrderState['items']) => void;
    setNewItem: (newItem: NewPurchaseOrderState['newItem']) => void;
    setPayments: (payments: PurchaseOrderPaymentState[]) => void;
    setAffectsCashRegister: (affects: boolean) => void;
    resetOrder: () => void;
    updateForm: (field: keyof NewPurchaseOrderState['form'], value: any) => void;
    updateNewItem: (field: keyof NewPurchaseOrderState['newItem'], value: any) => void;
}

const initialState: NewPurchaseOrderState = {
    form: {
        supplier_id: '',
        branch_id: '',
        order_date: new Date(),
        notes: '',
    },
    selectedCurrency: '',
    items: [],
    newItem: {
        product_id: '',
        quantity: '',
        purchase_price: '',
    },
    payments: [],
    affectsCashRegister: true,
};

const NewPurchaseOrderContext = createContext<NewPurchaseOrderContextType | undefined>(undefined);

export const NewPurchaseOrderProvider = ({ children }: { children: ReactNode }) => {
    const [form, setFormState] = useState<NewPurchaseOrderState['form']>(initialState.form);
    const [selectedCurrency, setSelectedCurrency] = useState<NewPurchaseOrderState['selectedCurrency']>(initialState.selectedCurrency);
    const [items, setItems] = useState<NewPurchaseOrderState['items']>(initialState.items);
    const [newItem, setNewItemState] = useState<NewPurchaseOrderState['newItem']>(initialState.newItem);
    const [payments, setPayments] = useState<NewPurchaseOrderState['payments']>(initialState.payments);
    const [affectsCashRegister, setAffectsCashRegister] = useState<boolean>(initialState.affectsCashRegister);

    // Load state from localStorage on mount (optional, user just asked for context, but persistence usually implies surviving refresh too. 
    // For now let's stick to memory persistence as "best practice" for a single session unless specificed. 
    // The user said "when I exit (the dialog) it doesn't lose everything", which usually means just component unmount.
    // We'll stick to Context state which survives unmounts of children.

    const resetOrder = () => {
        setFormState(initialState.form);
        setSelectedCurrency(initialState.selectedCurrency);
        setItems(initialState.items);
        setNewItemState(initialState.newItem);
        setPayments(initialState.payments);
        setAffectsCashRegister(initialState.affectsCashRegister);
    };

    const updateForm = (field: keyof NewPurchaseOrderState['form'], value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const updateNewItem = (field: keyof NewPurchaseOrderState['newItem'], value: any) => {
        setNewItemState(prev => ({ ...prev, [field]: value }));
    };

    const setForm = (newForm: NewPurchaseOrderState['form']) => {
        setFormState(newForm);
    }

    const setNewItem = (newItemData: NewPurchaseOrderState['newItem']) => {
        setNewItemState(newItemData);
    }

    return (
        <NewPurchaseOrderContext.Provider value={{
            state: { form, selectedCurrency, items, newItem, payments, affectsCashRegister },
            setForm,
            setSelectedCurrency,
            setItems,
            setNewItem,
            setPayments,
            setAffectsCashRegister,
            resetOrder,
            updateForm,
            updateNewItem
        }}>
            {children}
        </NewPurchaseOrderContext.Provider>
    );
};

export const useNewPurchaseOrder = () => {
    const context = useContext(NewPurchaseOrderContext);
    if (context === undefined) {
        throw new Error('useNewPurchaseOrder must be used within a NewPurchaseOrderProvider');
    }
    return context;
};
