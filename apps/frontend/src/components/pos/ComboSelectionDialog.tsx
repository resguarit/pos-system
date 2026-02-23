import { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Minus, Package, ShoppingCart } from 'lucide-react';
import type { Combo, ComboGroupOption } from '@/types/combo';
import { formatCurrency } from '@/utils/sale-calculations';

interface ComboSelectionDialogProps {
    combo: Combo | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (selectedOptions: Map<number, { option: ComboGroupOption, quantity: number }[]>) => void;
}

export function ComboSelectionDialog({
    combo,
    open,
    onOpenChange,
    onConfirm,
}: ComboSelectionDialogProps) {
    // Estado para rastrear las selecciones por grupo
    const [selections, setSelections] = useState<Map<number, { option: ComboGroupOption, quantity: number }[]>>(new Map());

    // Reiniciar estado cuando el combo cambia o el modal se abre
    useEffect(() => {
        if (open) {
            setSelections(new Map());
        }
    }, [combo, open]);

    // Manejar cambio de cantidad
    const handleQuantityChange = (groupId: number, option: ComboGroupOption, delta: number, maxRequired: number) => {
        setSelections((prev) => {
            const newMap = new Map(prev);
            const groupSelections = newMap.get(groupId) || [];
            const optionIndex = groupSelections.findIndex(s => s.option.id === option.id);

            let currentQty = optionIndex >= 0 ? groupSelections[optionIndex].quantity : 0;

            const currentGroupTotal = groupSelections.reduce((sum, item) => sum + item.quantity, 0);

            // Validar incrementos contra el máximo requerido del grupo
            if (delta > 0 && currentGroupTotal >= maxRequired) {
                return prev;
            }

            currentQty += delta;

            if (currentQty <= 0) {
                if (optionIndex >= 0) {
                    groupSelections.splice(optionIndex, 1);
                }
            } else {
                if (optionIndex >= 0) {
                    groupSelections[optionIndex].quantity = currentQty;
                } else {
                    groupSelections.push({ option, quantity: currentQty });
                }
            }

            newMap.set(groupId, [...groupSelections]);
            return newMap;
        });
    };

    const isConfirmedReady = useMemo(() => {
        if (!combo || !combo.groups) return false;

        // Todos los grupos deben tener la cantidad requerida exacta
        return combo.groups.every(group => {
            const groupSelections = selections.get(group.id) || [];
            const totalSelected = groupSelections.reduce((sum, item) => sum + item.quantity, 0);
            return totalSelected === group.required_quantity;
        });
    }, [combo, selections]);

    if (!combo) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] w-[95vw] max-h-[90dvh] md:max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 sm:p-6 pb-4 border-b shrink-0 bg-primary/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Package className="h-5 w-5 text-primary" />
                                </div>
                                {combo.name}
                            </DialogTitle>
                            <DialogDescription className="mt-1.5 text-muted-foreground">
                                Personaliza el combo seleccionando las opciones.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 bg-muted/10">
                    <div className="space-y-4">
                        {combo.groups && combo.groups.map((group) => {
                            const groupSelections = selections.get(group.id) || [];
                            const totalSelected = groupSelections.reduce((sum, item) => sum + item.quantity, 0);
                            const progressPercentage = (totalSelected / group.required_quantity) * 100;
                            const isComplete = totalSelected === group.required_quantity;

                            return (
                                <div key={group.id} className="space-y-2.5 bg-background p-3.5 rounded-xl shadow-sm border border-border/50">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-1">
                                        <h3 className="font-semibold text-base text-foreground leading-tight">
                                            {group.name}
                                        </h3>
                                        <Badge
                                            variant={isComplete ? "default" : "secondary"}
                                            className={`h-6 self-start sm:self-auto ${isComplete ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                                        >
                                            {totalSelected} / {group.required_quantity} elegidos
                                        </Badge>
                                    </div>

                                    <Progress
                                        value={progressPercentage}
                                        className={`h-2 ${isComplete ? '[&>div]:bg-green-500' : '[&>div]:bg-orange-400'}`}
                                    />

                                    <div className="grid gap-2 pt-2">
                                        {group.options && group.options.map((option) => {
                                            const optionSelection = groupSelections.find(s => s.option.id === option.id);
                                            const currentQty = optionSelection ? optionSelection.quantity : 0;
                                            const isSelected = currentQty > 0;

                                            return (
                                                <Card
                                                    key={option.id}
                                                    className={`flex flex-col sm:flex-row justify-between sm:items-center p-2.5 shadow-sm transition-all duration-200 gap-2 sm:gap-3 ${isSelected
                                                        ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                                                        : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
                                                        }`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-medium text-sm line-clamp-1 leading-tight transition-colors ${isSelected ? 'text-primary' : 'text-foreground/90'}`} title={option.product?.description}>
                                                            {option.product?.description}
                                                        </p>
                                                        {option.product?.sale_price && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                                                {formatCurrency(option.product.sale_price)}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className={`flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 p-1 rounded-md border transition-colors self-stretch sm:self-auto ${isSelected ? 'bg-background border-primary/20 shadow-sm' : 'bg-muted/40 border-transparent'
                                                        }`}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={`h-8 w-8 rounded-sm shrink-0 ${currentQty > 0 ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-muted-foreground opacity-50'
                                                                }`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleQuantityChange(group.id, option, -1, group.required_quantity);
                                                            }}
                                                            disabled={currentQty === 0}
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </Button>

                                                        <span className={`w-8 text-center font-bold text-sm ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                                            {currentQty}
                                                        </span>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={`h-8 w-8 rounded-sm shrink-0 ${!isComplete ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-muted-foreground opacity-50'
                                                                }`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleQuantityChange(group.id, option, 1, group.required_quantity);
                                                            }}
                                                            disabled={isComplete}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {(!combo.groups || combo.groups.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Este combo no tiene opciones personalizables.
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 sm:p-6 pt-4 border-t bg-muted/10 shrink-0">
                    <div className="w-full flex justify-between items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                onConfirm(selections);
                                onOpenChange(false);
                            }}
                            disabled={!isConfirmedReady}
                            className="gap-2 flex-1 sm:flex-none"
                        >
                            <ShoppingCart className="h-4 w-4 shrink-0" />
                            <span className="truncate">Confirmar Selección</span>
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
