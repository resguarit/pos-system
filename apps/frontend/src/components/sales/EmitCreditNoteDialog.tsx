import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Undo2 } from "lucide-react";
import { sileo } from "sileo";
import useApi from "@/hooks/useApi";
import { SaleHeader } from "@/types/sale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmitCreditNoteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    sale: SaleHeader;
    onSuccess: () => void;
}

export default function EmitCreditNoteDialog({
    isOpen,
    onClose,
    sale,
    onSuccess,
}: EmitCreditNoteDialogProps) {
    const { request } = useApi();
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState<string>(sale.total.toString());
    const [reason, setReason] = useState<string>("Devolución de mercadería");

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            sileo.error({ description: "El monto debe ser mayor a 0." });
            return;
        }

        if (parseFloat(amount) > sale.total) {
            sileo.error({ description: "El monto a devolver no puede ser mayor al total de la venta original." });
            return;
        }

        if (!reason.trim()) {
            sileo.error({ description: "Debes ingresar un motivo para la nota de crédito." });
            return;
        }

        try {
            setLoading(true);

            // Armamos el payload simulando una venta pero en reversa (Nota de Crédito)
            // Primero debemos obtener el comprobante de Nota de Crédito correspondiente
            // Por ejemplo, si original es Factura B (6), NC es Nota de Crédito B (8)
            // Delegaremos parte de esta lógica o la pediremos explícita al backend.

            const payload = {
                original_sale_id: sale.id,
                amount: parseFloat(amount),
                reason: reason,
                // Usamos un endpoint específico o el de ventas con data especial
            };

            await request({
                method: "POST",
                url: `/sales/${sale.id}/credit-note`,
                data: payload,
            });

            sileo.success({ description: "Nota de Crédito emitida correctamente." });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error al emitir Nota de Crédito:", error);
            const msg = error.response?.data?.message || "Ocurrió un error al emitir la Nota de Crédito.";
            sileo.error({ description: msg });
        } finally {
            setLoading(false);
        }
    };

    if (!sale) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Undo2 className="h-5 w-5 text-primary" />
                        Emitir Nota de Crédito
                    </DialogTitle>
                    <DialogDescription>
                        Estás a punto de emitir una Nota de Crédito / Devolución para la venta original <b>#{sale.receipt_number || sale.id}</b>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Monto a Devolver
                        </Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <span className="text-muted-foreground">$</span>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={sale.total}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="col-start-2 col-span-3 text-xs text-muted-foreground">
                            Máximo permitido: ${sale.total}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">
                            Motivo
                        </Label>
                        <Input
                            id="reason"
                            className="col-span-3"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ej: Devolución de mercadería, Error de facturación..."
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700 text-white border-none"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Emitiendo...
                            </>
                        ) : (
                            "Confirmar Emisión"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
