import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { 
    Loader2, 
    Pencil,
    Users,
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
    Truck,
    Hammer,
    Palmtree,
    Wallet,
    ShoppingBag,
    Box,
    Receipt,
    Utensils,
    GraduationCap,
    type LucideIcon
} from 'lucide-react';
import { toast } from 'sonner';
import useApi from '@/hooks/useApi';

// Available icons for categories
const CATEGORY_ICONS: { id: string; icon: LucideIcon; label: string }[] = [
    { id: 'users', icon: Users, label: 'Personal' },
    { id: 'building', icon: Building, label: 'Edificio' },
    { id: 'wifi', icon: Wifi, label: 'Internet' },
    { id: 'shield', icon: Shield, label: 'Seguros' },
    { id: 'landmark', icon: Landmark, label: 'Impuestos' },
    { id: 'briefcase', icon: Briefcase, label: 'Profesional' },
    { id: 'sparkles', icon: Sparkles, label: 'Limpieza' },
    { id: 'megaphone', icon: Megaphone, label: 'Marketing' },
    { id: 'percent', icon: Percent, label: 'Comisiones' },
    { id: 'package', icon: Package, label: 'Embalaje' },
    { id: 'car', icon: Car, label: 'Viáticos' },
    { id: 'paperclip', icon: Paperclip, label: 'Oficina' },
    { id: 'laptop', icon: Laptop, label: 'Software' },
    { id: 'truck', icon: Truck, label: 'Fletes' },
    { id: 'hammer', icon: Hammer, label: 'Mantenimiento' },
    { id: 'palmtree', icon: Palmtree, label: 'Vacaciones' },
    { id: 'wallet', icon: Wallet, label: 'Finanzas' },
    { id: 'shopping-bag', icon: ShoppingBag, label: 'Compras' },
    { id: 'box', icon: Box, label: 'Insumos' },
    { id: 'receipt', icon: Receipt, label: 'General' },
    { id: 'utensils', icon: Utensils, label: 'Comida' },
    { id: 'graduation-cap', icon: GraduationCap, label: 'Capacitación' },
];

interface ParentCategory {
    id: number;
    name: string;
}

interface ExpenseCategory {
    id: number;
    name: string;
    description: string | null;
    active: boolean;
    parent_id: number | null;
    parent?: ParentCategory | null;
    children?: ExpenseCategory[];
    icon?: string | null;
}

interface EditCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: ExpenseCategory | null;
    onSuccess: () => void;
}

interface CategoryFormData {
    name: string;
    description: string;
    active: boolean;
    parent_id: string;
    icon: string;
}

export function EditCategoryDialog({ open, onOpenChange, category, onSuccess }: EditCategoryDialogProps) {
    const { request } = useApi();

    const [formData, setFormData] = useState<CategoryFormData>({
        name: '',
        description: '',
        active: true,
        parent_id: '',
        icon: 'receipt',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);

    // Check if this category has children (cannot make it a subcategory if it does)
    const hasChildren = category?.children && category.children.length > 0;

    // Load parent categories
    useEffect(() => {
        const loadParentCategories = async () => {
            try {
                const response = await request({
                    method: 'GET',
                    url: '/expense-categories',
                    params: { parent_only: true, limit: 100 }
                });
                if (response?.data) {
                    // Only include categories without parent (top-level) and exclude current category
                    const topLevel = response.data.filter((c: any) => !c.parent_id && c.id !== category?.id);
                    setParentCategories(topLevel);
                }
            } catch (error) {
                console.error('Error loading parent categories:', error);
            }
        };

        if (open && category) {
            loadParentCategories();
        }
    }, [open, category, request]);

    // Load category data when dialog opens
    useEffect(() => {
        if (open && category) {
            setFormData({
                name: category.name || '',
                description: category.description || '',
                active: category.active ?? true,
                parent_id: category.parent_id ? category.parent_id.toString() : '',
                icon: category.icon || 'receipt',
            });
        }
    }, [open, category]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es requerido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !category) return;

        try {
            setLoading(true);

            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                active: formData.active,
                parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
                icon: formData.icon,
            };

            const response = await request({
                method: 'PUT',
                url: `/expense-categories/${category.id}`,
                data: payload,
            });

            if (response?.success) {
                toast.success('Categoría actualizada correctamente');
                onOpenChange(false);
                onSuccess();
            }
        } catch (error: any) {
            console.error('Error updating category:', error);
            toast.error(error?.response?.data?.message || 'Error al actualizar la categoría');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setErrors({});
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            {/* @ts-ignore */}
            <DialogContent className="max-w-md">
                {/* @ts-ignore */}
                <DialogHeader>
                    {/* @ts-ignore */}
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5" />
                        Editar Categoría
                    </DialogTitle>
                    {/* @ts-ignore */}
                    <DialogDescription>
                        Modifique los datos de la categoría{category?.parent ? ` (Subcategoría de ${category.parent.name})` : ''}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!hasChildren && (
                        <div className="space-y-2">
                            {/* @ts-ignore */}
                            <Label htmlFor="parent_id">Categoría Padre</Label>
                            <Select
                                value={formData.parent_id || 'none'}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, parent_id: value === 'none' ? '' : value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sin categoría padre (categoría principal)" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    <ScrollArea className="h-[200px]">
                                        <SelectItem value="none">Sin categoría padre (categoría principal)</SelectItem>
                                        {parentCategories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Seleccione una categoría padre para convertirla en subcategoría
                            </p>
                        </div>
                    )}

                    {hasChildren && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-sm text-amber-800">
                                Esta categoría tiene subcategorías. No se puede convertir en subcategoría de otra.
                            </p>
                        </div>
                    )}

                    {/* Icon Selector */}
                    <div className="space-y-2">
                        {/* @ts-ignore */}
                        <Label>Icono</Label>
                        <div className="grid grid-cols-6 gap-2 p-3 border rounded-lg max-h-[120px] overflow-y-auto">
                            {CATEGORY_ICONS.map(({ id, icon: Icon, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, icon: id }))}
                                    className={`flex flex-col items-center justify-center p-2 rounded-md transition-all hover:bg-muted ${
                                        formData.icon === id 
                                            ? 'bg-primary/10 border-2 border-primary ring-1 ring-primary' 
                                            : 'border border-transparent hover:border-muted-foreground/20'
                                    }`}
                                    title={label}
                                >
                                    <Icon className={`h-5 w-5 ${formData.icon === id ? 'text-primary' : 'text-muted-foreground'}`} />
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Seleccione un icono para identificar la categoría
                        </p>
                    </div>
                    <div className="space-y-2">
                        {/* @ts-ignore */}
                        <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ej: Servicios, Sueldos, Proveedores"
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        {/* @ts-ignore */}
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descripción opcional de la categoría..."
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            {/* @ts-ignore */}
                            <Label htmlFor="active">Activa</Label>
                            <p className="text-sm text-muted-foreground">
                                Las categorías inactivas no aparecen al crear gastos
                            </p>
                        </div>
                        {/* @ts-ignore */}
                        <Switch
                            id="active"
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Guardar Cambios'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
