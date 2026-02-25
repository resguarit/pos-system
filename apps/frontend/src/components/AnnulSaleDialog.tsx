import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, ArrowUp, CreditCard, Users, RefreshCw } from 'lucide-react';
import useApi from '@/hooks/useApi';
import { sileo } from "sileo"
interface AnnulSaleDialogProps {
	isOpen: boolean;
	onClose: () => void;
	sale: { id: number; receipt_number?: string } | null;
	onSuccess?: (saleId: number) => void;
}

export default function AnnulSaleDialog({ isOpen, onClose, sale, onSuccess }: AnnulSaleDialogProps) {
	const { request } = useApi();
	const [reason, setReason] = useState('');
	const [loading, setLoading] = useState(false);

	const handleConfirm = async () => {
		if (!sale) return;
		setLoading(true);
		try {
			await request({ method: 'POST', url: `/sales/${sale.id}/annul`, data: { reason } });
			sileo.success({ title: 'Venta anulada' });
			onSuccess?.(sale.id);
			onClose();
			setReason('');
		} catch (e: any) {
			sileo.error({ title: 'Error al anular', description: e?.response?.data?.message || 'Intenta nuevamente.' });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(o) => { if(!o) onClose(); }}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Anular Venta {sale?.receipt_number || sale?.id}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					{/* Advertencia */}
					<Alert className="border-amber-200 bg-amber-50">
						<AlertTriangle className="h-4 w-4 text-amber-600" />
						<AlertDescription className="text-amber-800">
							<strong>¡Atención!</strong> Esta acción es irreversible y tendrá los siguientes efectos:
						</AlertDescription>
					</Alert>

					{/* Información de lo que va a pasar */}
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
						<div className="flex items-center gap-2 mb-2">
							<Info className="h-4 w-4 text-blue-600" />
							<span className="text-sm font-medium text-blue-800">¿Qué sucederá al anular esta venta?</span>
						</div>
						<ul className="text-sm text-blue-700 space-y-1">
							<li className="flex items-center gap-2">
								<ArrowUp className="h-3 w-3" />
								Se repondrá el stock de todos los productos vendidos
							</li>
							<li className="flex items-center gap-2">
								<CreditCard className="h-3 w-3" />
								Se crearán movimientos de salida en caja para revertir los ingresos
							</li>
							<li className="flex items-center gap-2">
								<Users className="h-3 w-3" />
								Se revertirán los movimientos de cuenta corriente (si aplica)
							</li>
							<li className="flex items-center gap-2">
								<RefreshCw className="h-3 w-3" />
								Se actualizarán automáticamente los totales de caja
							</li>
						</ul>
					</div>

					<div>
						<label className="text-sm font-medium text-gray-700 mb-1 block">
							Motivo de anulación (opcional)
						</label>
						<Textarea
							placeholder="Ej: Error en la venta, producto defectuoso, solicitud del cliente..."
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							rows={3}
							className="resize-none"
						/>
					</div>
				</div>
				<DialogFooter className="flex gap-2 justify-end">
					<Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
						<Button type="button" variant="destructive" onClick={handleConfirm} disabled={loading || !sale}>
							{loading ? 'Anulando...' : 'Anular'}
						</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
