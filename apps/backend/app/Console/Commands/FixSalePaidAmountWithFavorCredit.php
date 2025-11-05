<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SaleHeader;
use App\Models\PaymentMethod;
use Illuminate\Support\Facades\DB;

class FixSalePaidAmountWithFavorCredit extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sales:fix-paid-amount-with-favor-credit';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Actualiza el paid_amount de las ventas que tienen crédito a favor pero el paid_amount no lo incluye';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $favorCreditMethod = PaymentMethod::where('name', 'Crédito a favor')->first();
        
        if (!$favorCreditMethod) {
            $this->error('No se encontró el método de pago "Crédito a favor"');
            return 1;
        }

        $this->info('Buscando ventas con crédito a favor...');

        $sales = SaleHeader::whereHas('salePayments', function($q) use ($favorCreditMethod) {
            $q->where('payment_method_id', $favorCreditMethod->id);
        })
        ->with('salePayments.paymentMethod')
        ->get();

        $this->info("Se encontraron {$sales->count()} ventas con crédito a favor");

        $updated = 0;
        $errors = 0;

        foreach ($sales as $sale) {
            try {
                DB::beginTransaction();

                // Calcular el total pagado incluyendo crédito a favor
                $favorCreditPaid = $sale->salePayments
                    ->filter(function ($payment) use ($favorCreditMethod) {
                        return $payment->paymentMethod && 
                               (int)$payment->paymentMethod->id === (int)$favorCreditMethod->id;
                    })
                    ->sum('amount');

                $cashPaid = $sale->salePayments
                    ->filter(function ($payment) {
                        return $payment->paymentMethod && 
                               $payment->paymentMethod->affects_cash === true;
                    })
                    ->sum('amount');

                $totalPaid = (float)$cashPaid + (float)$favorCreditPaid;
                $total = (float)$sale->total;
                $currentPaid = (float)$sale->paid_amount;

                // Solo actualizar si el paid_amount actual es diferente al calculado
                if (abs($currentPaid - $totalPaid) > 0.01) {
                    if ($totalPaid >= $total) {
                        $sale->payment_status = 'paid';
                        $sale->paid_amount = $total;
                    } elseif ($totalPaid > 0) {
                        $sale->payment_status = 'partial';
                        $sale->paid_amount = $totalPaid;
                    } else {
                        $sale->payment_status = 'pending';
                        $sale->paid_amount = 0;
                    }

                    $sale->save();

                    $this->info("Venta #{$sale->receipt_number}: Actualizado paid_amount de {$currentPaid} a {$sale->paid_amount}");
                    $updated++;
                }

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                $this->error("Error al actualizar venta #{$sale->receipt_number}: {$e->getMessage()}");
                $errors++;
            }
        }

        $this->info("\nProceso completado:");
        $this->info("- Ventas actualizadas: {$updated}");
        $this->info("- Errores: {$errors}");

        return 0;
    }
}
