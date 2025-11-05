<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CurrentAccount;
use App\Models\Customer;
use App\Models\CurrentAccountMovement;

class CheckCustomerBalance extends Command
{
    protected $signature = 'account:check-balance {customer_id : ID del cliente a verificar}';
    protected $description = 'Verificar el balance real de un cliente en cuenta corriente';

    public function handle()
    {
        $customerId = $this->argument('customer_id');
        
        $customer = Customer::with('person')->find($customerId);
        if (!$customer) {
            $this->error("Cliente con ID {$customerId} no encontrado.");
            return 1;
        }
        
        $account = CurrentAccount::where('customer_id', $customerId)->first();
        if (!$account) {
            $this->error("No se encontró cuenta corriente para el cliente.");
            return 1;
        }
        
        $this->info("=== CUENTA CORRIENTE DE: {$customer->person->first_name} {$customer->person->last_name} ===");
        $this->newLine();
        
        $this->line("📊 Balance en tabla (current_balance): " . number_format($account->current_balance, 2, ',', '.'));
        $this->line("   💡 Balance POSITIVO = Cliente debe dinero (deuda)");
        $this->line("   💡 Balance NEGATIVO = Cliente tiene saldo a favor");
        $this->newLine();
        
        // Recalcular balance desde movimientos
        $movements = CurrentAccountMovement::where('current_account_id', $account->id)
            ->whereNull('deleted_at')
            ->orderBy('movement_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();
        
        $calculatedBalance = 0;
        $this->info("📋 Últimos 5 movimientos:");
        $this->newLine();
        
        $this->table(
            ['ID', 'Fecha', 'Tipo', 'Descripción', 'Monto', 'Balance Antes', 'Balance Después'],
            $movements->take(5)->map(function ($movement) use (&$calculatedBalance) {
                $movementType = $movement->movementType;
                $balanceBefore = $calculatedBalance;
                
                if ($movementType->operation_type === 'entrada') {
                    $calculatedBalance += $movement->amount;
                } else {
                    $calculatedBalance -= $movement->amount;
                }
                
                return [
                    $movement->id,
                    $movement->movement_date ? $movement->movement_date->format('d/m/Y H:i') : '-',
                    $movementType->name,
                    substr($movement->description, 0, 30),
                    '$' . number_format($movement->amount, 2, ',', '.'),
                    '$' . number_format($balanceBefore, 2, ',', '.'),
                    '$' . number_format($calculatedBalance, 2, ',', '.'),
                ];
            })->toArray()
        );
        
        $this->newLine();
        $this->line("📈 Balance calculado desde movimientos: " . number_format($calculatedBalance, 2, ',', '.'));
        $this->newLine();
        
        // Comparar
        if (abs($account->current_balance - $calculatedBalance) > 0.01) {
            $this->warn("⚠️  DISCREPANCIA DETECTADA:");
            $this->warn("   Balance en tabla: " . number_format($account->current_balance, 2, ',', '.'));
            $this->warn("   Balance calculado: " . number_format($calculatedBalance, 2, ',', '.'));
            $this->warn("   Diferencia: " . number_format(abs($account->current_balance - $calculatedBalance), 2, ',', '.'));
            $this->newLine();
            $this->comment("💡 Ejecuta: php artisan current-accounts:recalculate-balances --account-id={$account->id}");
        } else {
            $this->info("✅ Los balances coinciden.");
        }
        
        // Verificar si tiene deuda según el sistema
        if ($account->current_balance > 0) {
            $this->newLine();
            $this->error("🔴 CLIENTE TIENE DEUDA: $" . number_format($account->current_balance, 2, ',', '.'));
        } elseif ($account->current_balance < 0) {
            $this->newLine();
            $this->info("🟢 CLIENTE TIENE SALDO A FAVOR: $" . number_format(abs($account->current_balance), 2, ',', '.'));
        } else {
            $this->newLine();
            $this->info("✅ CLIENTE SIN DEUDA NI SALDO A FAVOR: $0,00");
        }
        
        return 0;
    }
}



