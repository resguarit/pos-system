<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SaleHeader;
use Illuminate\Support\Facades\DB;

class FixSalesPaymentStatus extends Command
{
    protected $signature = 'sales:fix-payment-status';
    protected $description = 'Actualizar payment_status de ventas basándose en los pagos registrados';

    public function handle()
    {
        $this->info('🔄 Actualizando estado de pagos de las ventas...');

        // Obtener todas las ventas con pagos
        $sales = SaleHeader::with('salePayments')->get();
        $this->info("📊 Ventas encontradas: {$sales->count()}");

        $bar = $this->output->createProgressBar($sales->count());
        $bar->start();

        $paidCount = 0;
        $partialCount = 0;
        $pendingCount = 0;

        foreach ($sales as $sale) {
            try {
                // Calcular total pagado
                $totalPaid = (float)$sale->salePayments->sum('amount');
                $total = (float)$sale->total;
                
                // Actualizar payment_status y paid_amount
                if ($totalPaid >= $total) {
                    // Totalmente pagada
                    $sale->payment_status = 'paid';
                    $sale->paid_amount = $total;
                    $paidCount++;
                } elseif ($totalPaid > 0 && $totalPaid < $total) {
                    // Parcialmente pagada
                    $sale->payment_status = 'partial';
                    $sale->paid_amount = $totalPaid;
                    $partialCount++;
                } else {
                    // Sin pagos
                    $sale->payment_status = 'pending';
                    $sale->paid_amount = 0;
                    $pendingCount++;
                }
                
                $sale->save();
                
            } catch (\Exception $e) {
                $this->error("\n❌ Error procesando venta #{$sale->id}: " . $e->getMessage());
            }
            
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        $this->info("✅ Ventas completamente pagadas: {$paidCount}");
        $this->info("🔄 Ventas parcialmente pagadas: {$partialCount}");
        $this->info("⚠️  Ventas pendientes: {$pendingCount}");
        $this->info('✅ Proceso completado exitosamente');

        return 0;
    }
}

