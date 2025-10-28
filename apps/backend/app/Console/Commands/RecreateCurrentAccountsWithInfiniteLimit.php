<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CurrentAccount;
use App\Models\Customer;
use Illuminate\Support\Facades\DB;

class RecreateCurrentAccountsWithInfiniteLimit extends Command
{
    protected $signature = 'current-accounts:recreate-infinite {--force : Force recreation without confirmation}';
    protected $description = 'Borrar y recrear todas las cuentas corrientes con límite infinito';

    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('⚠️ Esto borrará TODAS las cuentas corrientes y las recreará con límite infinito. ¿Continuar?')) {
                $this->info('Operación cancelada.');
                return;
            }
        }

        try {
            DB::beginTransaction();

            $this->info('🗑️ Eliminando cuentas corrientes existentes...');
            
            // Contar cuentas antes de borrar
            $countBefore = CurrentAccount::count();
            $this->info("   - Cuentas existentes: {$countBefore}");
            
            // Verificar que no tengan balance diferente a 0
            $accountsWithBalance = CurrentAccount::where('current_balance', '!=', 0)->count();
            if ($accountsWithBalance > 0) {
                $this->error("❌ Hay {$accountsWithBalance} cuentas con balance diferente a cero. No se pueden eliminar.");
                $this->warn('Sugerencia: Espere a que todos los balances estén en $0 antes de ejecutar este comando.');
                DB::rollBack();
                return 1;
            }
            
            // Borrar todas las cuentas
            CurrentAccount::query()->delete();
            $this->info("✅ {$countBefore} cuentas eliminadas");
            
            $this->newLine();
            $this->info('🔄 Creando cuentas corrientes con límite infinito...');
            
            // Obtener todos los clientes
            $customers = Customer::all();
            $totalCustomers = $customers->count();
            
            $bar = $this->output->createProgressBar($totalCustomers);
            $bar->start();
            
            $created = 0;
            $errors = 0;
            
            foreach ($customers as $customer) {
                try {
                    CurrentAccount::create([
                        'customer_id' => $customer->id,
                        'credit_limit' => null, // NULL = límite infinito
                        'current_balance' => 0,
                        'status' => 'active',
                        'notes' => 'Cuenta recreada con límite infinito',
                        'opened_at' => now(),
                    ]);
                    $created++;
                } catch (\Exception $e) {
                    $this->error("Error creando cuenta para cliente {$customer->id}: " . $e->getMessage());
                    $errors++;
                }
                
                $bar->advance();
            }
            
            $bar->finish();
            $this->newLine();
            
            DB::commit();
            
            $this->info("✅ Cuentas corrientes recreadas: {$created}");
            if ($errors > 0) {
                $this->warn("⚠️  Errores encontrados: {$errors}");
            }
            
            // Verificar
            $countAfter = CurrentAccount::count();
            $nullLimitCount = CurrentAccount::whereNull('credit_limit')->count();
            
            $this->newLine();
            $this->info("📊 Resumen:");
            $this->info("   - Total de cuentas: {$countAfter}");
            $this->info("   - Con límite infinito (NULL): {$nullLimitCount}");
            
            $this->info('✅ Proceso completado exitosamente');
            
            return 0;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("❌ Error: " . $e->getMessage());
            return 1;
        }
    }
}

