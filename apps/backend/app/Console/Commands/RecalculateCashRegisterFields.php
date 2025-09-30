<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CashRegister;

class RecalculateCashRegisterFields extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cash-register:recalculate {--all : Recalcular todas las cajas} {--closed-only : Solo cajas cerradas}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalcular campos optimizados de cajas registradoras existentes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando recálculo de campos de cajas registradoras...');

        $query = CashRegister::query();

        if ($this->option('closed-only')) {
            $query->where('status', 'closed');
            $this->info('Procesando solo cajas cerradas...');
        } elseif (!$this->option('all')) {
            // Por defecto, solo cajas cerradas sin campos calculados
            $query->where('status', 'closed')
                  ->whereNull('expected_cash_balance');
            $this->info('Procesando cajas cerradas sin campos calculados...');
        } else {
            $this->info('Procesando todas las cajas...');
        }

        $cashRegisters = $query->get();
        $total = $cashRegisters->count();

        if ($total === 0) {
            $this->warn('No se encontraron cajas registradoras para procesar.');
            return 0;
        }

        $this->info("Procesando {$total} cajas registradoras...");
        $progressBar = $this->output->createProgressBar($total);
        $progressBar->start();

        $updated = 0;
        $errors = 0;

        foreach ($cashRegisters as $cashRegister) {
            try {
                $cashRegister->updateCalculatedFields();
                $updated++;
            } catch (\Exception $e) {
                $errors++;
                $this->error("\nError procesando caja ID {$cashRegister->id}: " . $e->getMessage());
            }
            
            $progressBar->advance();
        }

        $progressBar->finish();
        
        $this->newLine(2);
        $this->info("Proceso completado:");
        $this->line("✅ Cajas actualizadas: {$updated}");
        
        if ($errors > 0) {
            $this->error("❌ Errores: {$errors}");
        }

        return 0;
    }
}
