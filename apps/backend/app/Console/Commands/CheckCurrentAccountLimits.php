<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CurrentAccount;

class CheckCurrentAccountLimits extends Command
{
    protected $signature = 'current-accounts:check-limits';
    protected $description = 'Verificar los límites de crédito de las cuentas corrientes';

    public function handle()
    {
        $this->info('🔍 Verificando límites de crédito de cuentas corrientes...');
        $this->newLine();
        
        $total = CurrentAccount::count();
        $withNullLimit = CurrentAccount::whereNull('credit_limit')->count();
        $withZeroLimit = CurrentAccount::where('credit_limit', 0)->count();
        $withDefinedLimit = CurrentAccount::whereNotNull('credit_limit')->where('credit_limit', '>', 0)->count();
        
        $this->info("📊 Resumen:");
        $this->info("   - Total de cuentas: {$total}");
        $this->info("   - Con límite infinito (NULL): {$withNullLimit}");
        $this->info("   - Con límite $0: {$withZeroLimit}");
        $this->info("   - Con límite definido (>$0): {$withDefinedLimit}");
        $this->newLine();
        
        if ($withZeroLimit > 0 || ($withNullLimit < $total && $total > 0)) {
            $this->warn("⚠️  Hay cuentas que NO tienen límite infinito");
            $this->info("💡 Recomendación: Ejecutar 'php artisan current-accounts:recreate-infinite' para corregir");
        } else {
            $this->info("✅ Todas las cuentas tienen límite infinito correctamente configurado");
        }
        
        // Mostrar algunos ejemplos
        $this->newLine();
        $this->info("📋 Ejemplos:");
        
        $examples = CurrentAccount::with('customer.person')->limit(5)->get();
        foreach ($examples as $account) {
            $limitDisplay = $account->credit_limit === null ? 'NULL (Infinito)' : '$' . number_format($account->credit_limit, 2);
            $customerName = $account->customer->person ? 
                $account->customer->person->first_name . ' ' . $account->customer->person->last_name : 
                'Sin nombre';
            
            $this->line("   - {$customerName}: {$limitDisplay}");
        }
        
        return 0;
    }
}

