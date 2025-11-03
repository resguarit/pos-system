<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use Illuminate\Support\Facades\DB;

class RecalculateCurrentAccountBalances extends Command
{
    protected $signature = 'current-accounts:recalculate-balances {--account-id= : Recalcular solo una cuenta específica}';
    protected $description = 'Recalcular los balances de todas las cuentas corrientes basándose en los movimientos';

    public function handle()
    {
        $accountId = $this->option('account-id');

        $this->info('🔄 Recalculando balances de cuentas corrientes...');
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

        DB::beginTransaction();

        try {
            foreach ($accounts as $account) {
                try {
                    // Obtener todos los movimientos ordenados por fecha
                    $movements = CurrentAccountMovement::where('current_account_id', $account->id)
                        ->whereNull('deleted_at')
                        ->orderBy('movement_date', 'asc')
                        ->orderBy('id', 'asc')
                        ->get();

                    $balance = 0;
                    $lastMovementDate = null;

                    // Recalcular balance moviendo cada movimiento
                    foreach ($movements as $movement) {
                        $movementType = $movement->movementType;
                        
                        // Actualizar balance antes y después del movimiento
                        $balanceBefore = $balance;
                        
                        // Calcular el cambio según el tipo de operación
                        if ($movementType->operation_type === 'entrada') {
                            $balance += $movement->amount;
                        } else { // salida
                            $balance -= $movement->amount;
                        }
                        
                        $balanceAfter = $balance;

                        // Actualizar el movimiento si los balances cambiaron
                        if ($movement->balance_before != $balanceBefore || $movement->balance_after != $balanceAfter) {
                            $movement->balance_before = $balanceBefore;
                            $movement->balance_after = $balanceAfter;
                            $movement->save();
                        }

                        $lastMovementDate = $movement->movement_date ?? $movement->created_at;
                    }

                    // Actualizar el balance de la cuenta
                    $oldBalance = $account->current_balance;
                    $account->current_balance = $balance;
                    $account->last_movement_at = $lastMovementDate;
                    $account->save();

                    if ($oldBalance != $balance) {
                        $fixed++;
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
            $this->error("❌ Error al recalcular balances: " . $e->getMessage());
            return 1;
        }
    }
}

