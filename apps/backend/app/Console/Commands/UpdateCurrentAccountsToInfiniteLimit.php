<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CurrentAccount;
use App\Models\Customer;
use Illuminate\Support\Facades\DB;

class UpdateCurrentAccountsToInfiniteLimit extends Command
{
    protected $signature = 'current-accounts:set-infinite-limit {--force : Force update without confirmation}';
    protected $description = 'Actualizar todas las cuentas corrientes para que tengan límite infinito (NULL)';

    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('Esto cambiará TODAS las cuentas corrientes para que tengan límite infinito. ¿Continuar?')) {
                $this->info('Operación cancelada.');
                return;
            }
        }

        try {
            $this->info('🔄 Actualizando cuentas corrientes a límite infinito...');
            
            // Primero verificar que credit_limit acepta NULL
            $this->info('Verificando estructura de la tabla...');
            DB::statement("ALTER TABLE current_accounts MODIFY COLUMN credit_limit DECIMAL(12, 2) NULL");
            $this->info('✅ credit_limit ahora acepta NULL');
            
            // Contar cuentas (usar DB directo para evitar soft deletes)
            $totalAccounts = DB::table('current_accounts')->count();
            $this->info("Cuentas encontradas: {$totalAccounts}");
            
            if ($totalAccounts === 0) {
                $this->warn('No hay cuentas corrientes para actualizar.');
                return;
            }
            
            // Actualizar todas las cuentas para que tengan credit_limit = NULL
            $updated = DB::table('current_accounts')->update(['credit_limit' => null]);
            
            $this->info("✅ {$updated} cuentas actualizadas a límite infinito");
            
            // Verificar con DB directo
            $nullLimitCount = DB::table('current_accounts')
                ->whereNull('credit_limit')
                ->count();
            $this->info("Cuentas con límite infinito: {$nullLimitCount}");
            
            $this->info('✅ Proceso completado exitosamente');
            
            return 0;
        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            return 1;
        }
    }
}

