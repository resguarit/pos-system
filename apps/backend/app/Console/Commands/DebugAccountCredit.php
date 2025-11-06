<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use App\Models\MovementType;

class DebugAccountCredit extends Command
{
    protected $signature = 'current-accounts:debug-credit {account-id : ID de la cuenta corriente}';
    protected $description = 'Depurar el cálculo de crédito a favor de una cuenta específica';

    public function handle()
    {
        $accountId = $this->argument('account-id');
        
        $account = CurrentAccount::findOrFail($accountId);
        
        $this->info("🔍 Depurando crédito a favor para cuenta #{$accountId}");
        $this->newLine();
        
        $this->info("📊 Información de la cuenta:");
        $this->line("   - Balance actual: $" . number_format($account->current_balance, 2, ',', '.'));
        $this->line("   - Crédito acumulado: $" . number_format($account->accumulated_credit, 2, ',', '.'));
        $this->newLine();
        
        // Obtener tipos de movimiento que acumulan crédito
        $creditAccumulatingTypes = MovementType::where('is_current_account_movement', true)
            ->where('operation_type', 'entrada')
            ->whereIn('name', ['Ajuste a favor', 'Depósito a cuenta'])
            ->pluck('id', 'name')
            ->toArray();
        
        $this->info("💰 Movimientos que acumulan crédito:");
        $totalAccumulated = 0;
        foreach ($creditAccumulatingTypes as $typeName => $typeId) {
            $movements = CurrentAccountMovement::where('current_account_id', $accountId)
                ->where('movement_type_id', $typeId)
                ->get();
            
            $typeTotal = $movements->sum('amount');
            $totalAccumulated += $typeTotal;
            
            $this->line("   - {$typeName}: $" . number_format($typeTotal, 2, ',', '.') . " ({$movements->count()} movimientos)");
            
            foreach ($movements as $movement) {
                $this->line("     • {$movement->movement_date?->format('d/m/Y')}: $" . number_format($movement->amount, 2, ',', '.') . " - {$movement->description}");
            }
        }
        $this->line("   - TOTAL ACUMULADO: $" . number_format($totalAccumulated, 2, ',', '.'));
        $this->newLine();
        
        // Obtener movimientos de uso de crédito
        $creditUsageTypes = MovementType::where('is_current_account_movement', true)
            ->where('operation_type', 'entrada')
            ->whereIn('name', ['Pago de cuenta corriente', 'Uso de crédito a favor'])
            ->pluck('id', 'name')
            ->toArray();
        
        $this->info("💸 Movimientos de uso de crédito:");
        $totalUsed = 0;
        foreach ($creditUsageTypes as $typeName => $typeId) {
            $movements = CurrentAccountMovement::where('current_account_id', $accountId)
                ->where('movement_type_id', $typeId)
                ->get();
            
            $this->line("   - {$typeName}: {$movements->count()} movimientos");
            
            foreach ($movements as $movement) {
                $metadata = $movement->metadata ?? [];
                $creditFromAccumulated = $metadata['credit_from_accumulated'] ?? null;
                $creditFromBalance = $metadata['credit_from_balance'] ?? null;
                
                if ($creditFromAccumulated !== null) {
                    $totalUsed += (float) $creditFromAccumulated;
                    $this->line("     • {$movement->movement_date?->format('d/m/Y')}: $" . number_format($movement->amount, 2, ',', '.') . " - Crédito del acumulado: $" . number_format($creditFromAccumulated, 2, ',', '.'));
                } else {
                    $this->line("     • {$movement->movement_date?->format('d/m/Y')}: $" . number_format($movement->amount, 2, ',', '.') . " - SIN METADATA (ignorado en recalculación)");
                }
            }
        }
        $this->line("   - TOTAL USADO DEL ACUMULADO: $" . number_format($totalUsed, 2, ',', '.'));
        $this->newLine();
        
        // Calcular crédito acumulado esperado
        $expectedAccumulatedCredit = max(0, $totalAccumulated - $totalUsed);
        $this->info("📈 Cálculo esperado:");
        $this->line("   - Crédito acumulado esperado: $" . number_format($expectedAccumulatedCredit, 2, ',', '.'));
        $this->line("   - Crédito acumulado actual: $" . number_format($account->accumulated_credit, 2, ',', '.'));
        $this->line("   - Diferencia: $" . number_format($account->accumulated_credit - $expectedAccumulatedCredit, 2, ',', '.'));
        $this->newLine();
        
        // Calcular crédito disponible
        $balance = (float) $account->current_balance;
        $accumulatedCredit = (float) $account->accumulated_credit;
        $creditFromBalance = $balance < 0 ? abs($balance) : 0.0;
        $totalCredit = $creditFromBalance + $accumulatedCredit;
        
        $this->info("💳 Crédito disponible:");
        $this->line("   - Crédito del balance negativo: $" . number_format($creditFromBalance, 2, ',', '.'));
        $this->line("   - Crédito acumulado: $" . number_format($accumulatedCredit, 2, ',', '.'));
        $this->line("   - TOTAL DISPONIBLE: $" . number_format($totalCredit, 2, ',', '.'));
        $this->newLine();
        
        return 0;
    }
}

