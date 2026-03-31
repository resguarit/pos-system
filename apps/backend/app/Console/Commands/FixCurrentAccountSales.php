<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SaleHeader;
use App\Models\PaymentMethod;
use Illuminate\Support\Facades\DB;

class FixCurrentAccountSales extends Command
{
    protected $signature = 'sales:fix-current-account-status';
    protected $description = 'Corrige el payment_status y paid_amount de ventas que tienen pagos a cuenta corriente';

    public function handle()
    {
        $this->info('🔍 Buscando ventas con pagos a cuenta corriente...');
        
        $currentAccountPaymentMethod = PaymentMethod::where('is_customer_credit', true)->first();
        
        if (!$currentAccountPaymentMethod) {
            $this->error('No se encontró un método de pago marcado como cuenta corriente (is_customer_credit=true)');
            return 1;
        }
        
        $this->info("✅ Método de pago encontrado: ID {$currentAccountPaymentMethod->id}");
        
        // Buscar ventas que tienen pagos a cuenta corriente
        $sales = SaleHeader::whereHas('salePayments', function ($query) use ($currentAccountPaymentMethod) {
            $query->where('payment_method_id', $currentAccountPaymentMethod->id);
        })
        ->with(['salePayments.paymentMethod'])
        ->get();
        
        $this->info("📦 Encontradas {$sales->count()} ventas con pagos a cuenta corriente");
        
        $fixed = 0;
        $skipped = 0;
        
        foreach ($sales as $sale) {
            $paidAmount = $sale->salePayments
                ->filter(function ($payment) {
                    return PaymentMethod::paymentCountsTowardSalePaid($payment->paymentMethod);
                })
                ->sum('amount');
            
            $total = (float)$sale->total;
            
            // Determinar nuevo estado
            $newPaymentStatus = 'pending';
            $newPaidAmount = (float)$paidAmount;
            
            if ($newPaidAmount >= $total) {
                $newPaymentStatus = 'paid';
                $newPaidAmount = $total;
            } elseif ($newPaidAmount > 0) {
                $newPaymentStatus = 'partial';
            }
            
            // Solo actualizar si cambió algo
            if ($sale->payment_status !== $newPaymentStatus || 
                abs((float)$sale->paid_amount - $newPaidAmount) > 0.01) {
                
                $oldStatus = $sale->payment_status;
                $oldPaid = $sale->paid_amount;
                
                $sale->payment_status = $newPaymentStatus;
                $sale->paid_amount = $newPaidAmount;
                $sale->save();
                
                $this->line("✅ Venta #{$sale->receipt_number} (ID: {$sale->id}):");
                $this->line("   Estado: {$oldStatus} → {$newPaymentStatus}");
                $this->line("   Pagado: \${$oldPaid} → \${$newPaidAmount}");
                $this->line("   Pendiente: \${" . ($total - $oldPaid) . "} → \${" . ($total - $newPaidAmount) . "}");
                
                $fixed++;
            } else {
                $skipped++;
            }
        }
        
        $this->info("\n✅ Proceso completado:");
        $this->info("   📝 Ventas corregidas: {$fixed}");
        $this->info("   ⏭️  Ventas sin cambios: {$skipped}");
        
        return 0;
    }
}

