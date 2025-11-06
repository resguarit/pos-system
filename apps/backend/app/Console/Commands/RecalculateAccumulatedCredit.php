<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use App\Models\MovementType;
use Illuminate\Support\Facades\DB;

class RecalculateAccumulatedCredit extends Command
{
    protected $signature = 'current-accounts:recalculate-accumulated-credit {--account-id= : Recalcular solo una cuenta específica}';
    protected $description = 'Recalcular el crédito acumulado de las cuentas corrientes basándose en los movimientos históricos';

    public function handle()
    {
        $accountId = $this->option('account-id');

        $this->info('🔄 Recalculando crédito acumulado de cuentas corrientes...');
        $this->newLine();

        $query = CurrentAccount::query();
        if ($accountId) {
            $query->where('id', $accountId);
        }

        $accounts = $query->get();
        $totalAccounts = $accounts->count();

        if ($totalAccounts === 0) {
            $this->warn('No se encontraron cuentas corrientes.');
            return 0;
        }

        $this->info("📊 Procesando {$totalAccounts} cuenta(s)...");
        $this->newLine();

        $bar = $this->output->createProgressBar($totalAccounts);
        $bar->start();

        $fixed = 0;
        $errors = 0;

        // Obtener tipos de movimiento que acumulan crédito
        $creditAccumulatingTypes = MovementType::where('is_current_account_movement', true)
            ->where('operation_type', 'entrada')
            ->whereIn('name', ['Ajuste a favor', 'Depósito a cuenta'])
            ->pluck('id')
            ->toArray();

        DB::beginTransaction();

        try {
            foreach ($accounts as $account) {
                try {
                    // Calcular crédito acumulado total desde movimientos históricos
                    $totalAccumulated = CurrentAccountMovement::where('current_account_id', $account->id)
                        ->whereIn('movement_type_id', $creditAccumulatingTypes)
                        ->sum('amount');

                    // Calcular crédito usado (movimientos de uso de crédito a favor)
                    $creditUsageTypes = MovementType::where('is_current_account_movement', true)
                        ->where('operation_type', 'entrada')
                        ->whereIn('name', ['Pago de cuenta corriente', 'Uso de crédito a favor'])
                        ->pluck('id')
                        ->toArray();

                    $totalUsed = 0;
                    $creditUsageMovements = CurrentAccountMovement::where('current_account_id', $account->id)
                        ->whereIn('movement_type_id', $creditUsageTypes)
                        ->orderBy('movement_date', 'asc')
                        ->orderBy('id', 'asc')
                        ->get();

                    // Simular el consumo de crédito acumulado basándose en el orden histórico
                    $simulatedAccumulatedCredit = (float) $totalAccumulated;
                    
                    foreach ($creditUsageMovements as $movement) {
                        $metadata = $movement->metadata ?? [];
                        $movementAmount = (float) $movement->amount;
                        
                        // Si tiene metadata con credit_from_accumulated, usarlo directamente
                        if (isset($metadata['credit_from_accumulated'])) {
                            $creditUsed = (float) $metadata['credit_from_accumulated'];
                            $totalUsed += $creditUsed;
                            $simulatedAccumulatedCredit -= $creditUsed;
                        } else {
                            // Si no tiene metadata, simular el consumo histórico:
                            // 1. Primero consumir del crédito acumulado disponible
                            // 2. Luego consumir del balance negativo (si existe)
                            $creditFromAccumulated = min($movementAmount, max(0, $simulatedAccumulatedCredit));
                            $totalUsed += $creditFromAccumulated;
                            $simulatedAccumulatedCredit -= $creditFromAccumulated;
                        }
                    }

                    // El crédito acumulado actual es el total acumulado menos el usado (simulado)
                    $calculatedAccumulatedCredit = max(0, $simulatedAccumulatedCredit);

                    $oldAccumulatedCredit = (float) $account->accumulated_credit;
                    $account->accumulated_credit = $calculatedAccumulatedCredit;
                    $account->save();

                    if (abs($oldAccumulatedCredit - $calculatedAccumulatedCredit) > 0.01) {
                        $fixed++;
                        $this->newLine();
                        $this->line("Cuenta #{$account->id}: {$oldAccumulatedCredit} → {$calculatedAccumulatedCredit}");
                    }

                } catch (\Exception $e) {
                    $this->newLine();
                    $this->error("Error en cuenta ID {$account->id}: " . $e->getMessage());
                    $errors++;
                }

                $bar->advance();
            }

            DB::commit();
            $bar->finish();
            $this->newLine(2);

            $this->info("✅ Recalculación completada.");
            $this->info("   - Cuentas procesadas: {$totalAccounts}");
            $this->info("   - Cuentas corregidas: {$fixed}");
            if ($errors > 0) {
                $this->warn("   - Errores: {$errors}");
            }

            return 0;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->newLine();
            $this->error("❌ Error al recalcular crédito acumulado: " . $e->getMessage());
            return 1;
        }
    }
}

