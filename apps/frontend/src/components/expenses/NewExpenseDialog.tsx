import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Loader2,
    Plus,
    ArrowLeft,
    Zap,
    Wallet,
    Building,
    Wifi,
    Shield,
    Landmark,
    Briefcase,
    Sparkles,
    Megaphone,
    Percent,
    Package,
    Car,
    Paperclip,
    Laptop,
    Hammer,
    Palmtree,
    Users,
    ShoppingBag,
    Box,
    Receipt,
    GraduationCap,
    Utensils,
    TruckIcon
} from 'lucide-react';
import { sileo } from "sileo"
import { useBranch } from '@/context/BranchContext';
import { useSystemConfigContext } from '@/context/SystemConfigContext';
import useApi from '@/hooks/useApi';
import { expensesService, ExpenseCategory, Expense } from '@/lib/api/expensesService';

// Icon mapping from icon ID to component
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; color?: string }>> = {
    'users': Users,
    'building': Building,
    'wifi': Wifi,
    'shield': Shield,
    'landmark': Landmark,
    'briefcase': Briefcase,
    'sparkles': Sparkles,
    'megaphone': Megaphone,
    'percent': Percent,
    'package': Package,
    'car': Car,
    'paperclip': Paperclip,
    'laptop': Laptop,
    'truck': TruckIcon,
    'hammer': Hammer,
    'palmtree': Palmtree,
    'wallet': Wallet,
    'shopping-bag': ShoppingBag,
    'box': Box,
    'receipt': Receipt,
    'utensils': Utensils,
    'graduation-cap': GraduationCap,
};

// Helper to get icon by ID or fallback to name-based inference
const getCategoryIcon = (iconId: string | undefined | null, name: string, size: string = "h-4 w-4", color?: string) => {
    const props = { className: size, ...(color && { color }) };

    // First try to use the stored icon ID
    if (iconId && ICON_MAP[iconId]) {
        const IconComponent = ICON_MAP[iconId];
        return <IconComponent {...props} />;
    }

    // Fallback to name-based inference
    const normalized = name.toLowerCase();

    if (normalized.includes('sueldo') || normalized.includes('salario')) return <Users {...props} />;
    if (normalized.includes('alquiler') || normalized.includes('local')) return <Building {...props} />;
    if (normalized.includes('internet') || normalized.includes('telecom')) return <Wifi {...props} />;
    if (normalized.includes('seguro')) return <Shield {...props} />;
    if (normalized.includes('impuesto') || normalized.includes('tasa') || normalized.includes('afip') || normalized.includes('arca')) return <Landmark {...props} />;
    if (normalized.includes('honorario') || normalized.includes('contador') || normalized.includes('abogado')) return <Briefcase {...props} />;
    if (normalized.includes('limpieza')) return <Sparkles {...props} />;
    if (normalized.includes('publicidad') || normalized.includes('marketing')) return <Megaphone {...props} />;
    if (normalized.includes('comision')) return <Percent {...props} />;
    if (normalized.includes('embalaje') || normalized.includes('packaging')) return <Package {...props} />;
    if (normalized.includes('viatico') || normalized.includes('viaje')) return <Car {...props} />;
    if (normalized.includes('oficina') || normalized.includes('libreria')) return <Paperclip {...props} />;
    if (normalized.includes('software') || normalized.includes('licencia') || normalized.includes('sistema')) return <Laptop {...props} />;
    if (normalized.includes('flete') || normalized.includes('envio') || normalized.includes('transporte')) return <TruckIcon {...props} />;
    if (normalized.includes('mantenimiento') || normalized.includes('reparacion')) return <Hammer {...props} />;
    if (normalized.includes('aguinaldo') || normalized.includes('vacaciones')) return <Palmtree {...props} />;
    if (normalized.includes('social') || normalized.includes('sindicato')) return <Users {...props} />;
    if (normalized.includes('banco') || normalized.includes('financiero')) return <Wallet {...props} />;
    if (normalized.includes('mercaderia') || normalized.includes('compra')) return <ShoppingBag {...props} />;
    if (normalized.includes('insumo')) return <Box {...props} />;
    if (normalized.includes('comida') || normalized.includes('refrigerio')) return <Utensils {...props} />;
    if (normalized.includes('capacitacion') || normalized.includes('curso')) return <GraduationCap {...props} />;

    // Default fallback
    return <Receipt {...props} />;
};

interface NewExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface ExpenseFormData {
    description: string;
    amount: string;
    date: string;
    due_date: string;
    category_id: string;
    employee_id: string;
    payment_method_id: string;
    branch_id: string; // branch_id
    status: string;
    is_recurring: boolean;
    recurrence_interval: string;
    notes: string;
}

const initialFormData: ExpenseFormData = {
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    category_id: '',
    employee_id: '',
    payment_method_id: '',
    branch_id: '',
    status: 'pending',
    is_recurring: false,
    recurrence_interval: 'monthly',
    notes: '',
};

export function NewExpenseDialog({ open, onOpenChange, onSuccess }: NewExpenseDialogProps) {
    const { request } = useApi(); // Use useApi hook
    const { selectedBranchIds, branches } = useBranch();
    const { config } = useSystemConfigContext();
    const [step, setStep] = useState<1 | 2>(1); // 1: Seleccionar Tipo, 2: Detalles

    // Data
    const [categoriesTree, setCategoriesTree] = useState<ExpenseCategory[]>([]);
    const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<{ id: number; name: string }[]>([]);

    // Selection State
    const [selectedParentCategory, setSelectedParentCategory] = useState<ExpenseCategory | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<ExpenseCategory | null>(null);

    // Form State
    const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            loadInitialData();
            // Set default branch if only one selected
            if (selectedBranchIds.length === 1) {
                setFormData(prev => ({ ...prev, branch_id: selectedBranchIds[0] }));
            }
        } else {
            resetForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, selectedBranchIds]);

    const resetForm = () => {
        setFormData(initialFormData);
        setErrors({});
        setStep(1);
        setSelectedParentCategory(null);
        setSelectedSubCategory(null);
    };

    const loadInitialData = async () => {
        // Normalizar respuestas a arrays para evitar errores de .map()
        const normalizeToArray = <T,>(payload: unknown): T[] => {
            // Si ya es un array, devolverlo
            if (Array.isArray(payload)) return payload as T[];

            // Si tiene .data como array, usar eso
            const obj = payload as Record<string, unknown>;
            if (obj?.data && Array.isArray(obj.data)) return obj.data as T[];

            // Si data es un objeto pero no un array, probablemente es un item único o vacío
            // No mostrar warning, solo devolver array vacío
            return [];
        };

        try {
            // Load Payment Methods using API directly as service might not have it exposed
            const fetchPaymentMethods = async () => {
                try {
                    const response = await request({ method: 'GET', url: '/payment-methods?active=true' });
                    if (response?.data) return response.data;
                    return [];
                } catch (e) {
                    console.error("Error fetching payment methods:", e);
                    return [];
                }
            };

            const [tree, recent, pms] = await Promise.all([
                expensesService.getCategoriesTree().catch(e => {
                    console.error("Error fetching categories tree:", e);
                    return { data: [] };
                }),
                expensesService.getRecentExpenses().catch(e => {
                    console.error("Error fetching recent expenses:", e);
                    return { data: [] };
                }),
                fetchPaymentMethods(),
            ]);

            setCategoriesTree(normalizeToArray<ExpenseCategory>(tree));
            setRecentExpenses(normalizeToArray<Expense>(recent));
            // Excluir Cuenta Corriente: los gastos no se pueden pagar con cuenta corriente
            setPaymentMethods(normalizeToArray(pms).filter((pm: { name: string }) => pm.name !== 'Cuenta Corriente'));
        } catch (error) {
            console.error("Error loading data", error);
        }
    };

    // Let's use useApi hook as in original file for things not in service
    // But since I want to clean up, I will assume I can put everything in service.
    // For now I'll use a placeholder for PMs fetch

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Monto inválido';
        if (!formData.date) newErrors.date = 'Fecha requerida';
        if (!formData.category_id) newErrors.category_id = 'Categoría requerida';
        if (!formData.branch_id) newErrors.branch_id = 'Sucursal requerida';
        if (!formData.payment_method_id) newErrors.payment_method_id = 'Método de pago requerido';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setLoading(true);
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                category_id: parseInt(formData.category_id),
                branch_id: parseInt(formData.branch_id),
                employee_id: formData.employee_id ? parseInt(formData.employee_id) : null,
                payment_method_id: formData.payment_method_id ? parseInt(formData.payment_method_id) : null,
                recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
            };

            await expensesService.createExpense(payload);
            sileo.success({ title: 'Gasto registrado correctamente' });
            onSuccess();
            onOpenChange(false);
        } catch (error: unknown) {
            console.error(error);
            sileo.error({ title: 'Error al registrar gasto' });
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAdd = (expense: Expense) => {
        setFormData({
            ...initialFormData,
            amount: expense.amount.toString(),
            category_id: expense.category_id.toString(),
            description: expense.description, // Optional: copy description or leave blank? User wanted fast recurring.
            // Maybe keeping description is good for "recurring" feeling.
            branch_id: selectedBranchIds.length === 1 ? selectedBranchIds[0] : (expense.branch_id?.toString() || ''),
            payment_method_id: expense.payment_method_id?.toString() || '',
            status: 'pending',
            date: new Date().toISOString().split('T')[0],
        });

        // Find category objects for UI state
        // This is complex because we need to search the tree.
        // For simplicity we just set the ID and go to step 2 directly

        // Try to find category in tree to set UI state correctly
        let foundParent = null;
        let foundSub = null;

        // Recursive search
        const findCat = (cats: ExpenseCategory[]): boolean => {
            for (const cat of cats) {
                if (cat.id === expense.category_id) {
                    // It's this one. If it has parent, we need parent.
                    if (cat.parent_id) {
                        // Find parent in top level (assuming 2 levels max for now)
                        foundParent = categoriesTree.find(p => p.id === cat.parent_id);
                        foundSub = cat;
                    } else {
                        foundParent = cat;
                    }
                    return true;
                }
                if (cat.children && findCat(cat.children)) return true;
            }
            return false;
        };

        findCat(categoriesTree);

        if (foundParent) setSelectedParentCategory(foundParent);
        if (foundSub) setSelectedSubCategory(foundSub);

        setStep(2);
    };

    const handleCategorySelect = (category: ExpenseCategory) => {
        if (category.children && category.children.length > 0) {
            setSelectedParentCategory(category);
            // Stay in step 1 effectively but showing subcategories? 
            // Or move to step 1.5? 
            // Let's handle it within step 1 view
        } else {
            // It's a leaf category (or subcategory selected directly if we support that)
            setSelectedSubCategory(category);
            setFormData(prev => ({ ...prev, category_id: category.id.toString() }));
            setStep(2);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 shadow-2xl">
                <DialogHeader className="p-4 border-b bg-background sticky top-0 z-10">
                    <DialogTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
                        {step === 2 && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setStep(1)}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        {step === 1 ? 'Nuevo Registro de Gasto' : (selectedSubCategory?.name || selectedParentCategory?.name)}
                    </DialogTitle>
                </DialogHeader>

                {/* Content Area with Scroll */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 ? (
                        <div className="space-y-6">
                            {/* Recent Expenses Section */}
                            {recentExpenses.length > 0 && !selectedParentCategory && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                        <Zap className="h-4 w-4" style={{ color: config?.primary_color || '#F59E0B', fill: config?.primary_color || '#F59E0B' }} />
                                        <span>Recientes</span>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
                                        {recentExpenses.map((expense) => (
                                            <button
                                                key={expense.id}
                                                onClick={() => handleQuickAdd(expense)}
                                                className="flex flex-col items-start gap-1 p-3 min-w-[140px] rounded-xl border bg-card hover:border-primary hover:shadow-md transition-all group shrink-0 text-left"
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-primary">
                                                        {getCategoryIcon(expense.category?.icon, expense.category?.name || 'Gasto', "h-5 w-5", config?.primary_color)}
                                                    </span>
                                                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                                        ${expense.amount}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-medium text-foreground line-clamp-1 mt-1">
                                                    {expense.category?.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Categories Grid */}
                            {!selectedParentCategory ? (
                                <div className="space-y-3">
                                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                        Categorías
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {categoriesTree.map((category) => (
                                            <button
                                                key={category.id}
                                                onClick={() => handleCategorySelect(category)}
                                                className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card hover:border-primary/50 hover:bg-muted/50 hover:shadow-lg transition-all text-center group gap-3 aspect-[4/3] relative overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="text-foreground/80 group-hover:scale-110 transition-all duration-300 drop-shadow-sm">
                                                    {getCategoryIcon(category.icon, category.name, "h-8 w-8", config?.primary_color)}
                                                </div>
                                                <div className="font-semibold text-sm leading-tight text-foreground/90 group-hover:text-primary transition-colors">
                                                    {category.name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
                                        <div className="flex items-center gap-3">
                                            <span>
                                                {getCategoryIcon(selectedParentCategory.icon, selectedParentCategory.name, "h-8 w-8", config?.primary_color)}
                                            </span>
                                            <div>
                                                <h3 className="font-bold text-lg text-primary">
                                                    {selectedParentCategory.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">Selecciona una subcategoría</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedParentCategory(null)}
                                            className="uppercase text-xs font-bold"
                                        >
                                            Cambiar Categoría
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {selectedParentCategory.children?.map((subCat) => (
                                            <button
                                                key={subCat.id}
                                                onClick={() => {
                                                    setSelectedSubCategory(subCat);
                                                    setFormData(prev => ({ ...prev, category_id: subCat.id.toString() }));
                                                    setStep(2);
                                                }}
                                                className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all text-center group min-h-[100px] gap-2"
                                            >
                                                <div className="text-foreground/70 group-hover:text-primary transition-colors mb-1">
                                                    {getCategoryIcon(subCat.icon, subCat.name, "h-6 w-6", config?.primary_color)}
                                                </div>
                                                <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">
                                                    {subCat.name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto py-2">
                            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
                                    <div className="h-12 w-12 rounded-lg bg-background border flex items-center justify-center text-primary shadow-sm">
                                        {getCategoryIcon(selectedSubCategory?.icon || selectedParentCategory?.icon, selectedSubCategory?.name || selectedParentCategory?.name || 'Gasto', "h-6 w-6", config?.primary_color)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{selectedParentCategory?.name}</div>
                                        <div className="font-bold text-lg text-foreground">{selectedSubCategory?.name}</div>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)}>
                                        Cambiar
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Monto</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">$</span>
                                            <Input
                                                type="number"
                                                className={`pl-8 text-lg font-bold h-12 ${errors.amount ? 'border-red-500' : ''}`}
                                                placeholder="0.00"
                                                value={formData.amount}
                                                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Fecha</Label>
                                        <Input
                                            type="date"
                                            className={`h-12 text-sm ${errors.date ? 'border-red-500' : ''}`}
                                            value={formData.date}
                                            onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Descripción</Label>
                                    <Input
                                        className="h-12 text-sm"
                                        placeholder="Nota opcional..."
                                        value={formData.description}
                                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Sucursal</Label>
                                        <Select
                                            value={formData.branch_id}
                                            onValueChange={v => setFormData(prev => ({ ...prev, branch_id: v }))}
                                        >
                                            <SelectTrigger className={`h-12 text-sm ${errors.branch_id ? 'border-red-500' : ''}`}>
                                                <SelectValue placeholder="Elegir Sucursal" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branches.filter(b => selectedBranchIds.includes(b.id.toString())).map(b => (
                                                    <SelectItem key={b.id} value={b.id.toString()}>{b.description}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Medio de Pago</Label>
                                        <Select
                                            value={formData.payment_method_id}
                                            onValueChange={v => setFormData(prev => ({ ...prev, payment_method_id: v }))}
                                        >
                                            <SelectTrigger className={`h-12 text-sm ${errors.payment_method_id ? 'border-red-500' : ''}`}>
                                                <SelectValue placeholder="Elegir Medio de Pago" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {paymentMethods.map(pm => (
                                                    <SelectItem key={pm.id} value={pm.id.toString()}>{pm.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/10">
                                    <div className="leading-tight">
                                        <Label className="text-sm font-bold">Gasto Recurrente</Label>
                                        <p className="text-xs text-muted-foreground mt-1">Repetir este gasto automáticamente</p>
                                    </div>
                                    <Switch
                                        checked={formData.is_recurring}
                                        onCheckedChange={c => setFormData(prev => ({ ...prev, is_recurring: c }))}
                                    />
                                </div>

                                {formData.is_recurring && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 p-4 rounded-xl border border-dashed border-primary/20 bg-primary/5">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Frecuencia</Label>
                                        <Select
                                            value={formData.recurrence_interval}
                                            onValueChange={v => setFormData(prev => ({ ...prev, recurrence_interval: v }))}
                                        >
                                            <SelectTrigger className="h-10 text-sm bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily">Diario</SelectItem>
                                                <SelectItem value="weekly">Semanal</SelectItem>
                                                <SelectItem value="monthly">Mensual</SelectItem>
                                                <SelectItem value="yearly">Anual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <DialogFooter className="mt-8 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur pb-2">
                                    <Button type="submit" size="lg" disabled={loading} className="w-full text-base font-bold shadow-lg hover:shadow-xl transition-all">
                                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
                                        Registrar Gasto
                                    </Button>
                                </DialogFooter>
                            </form>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
