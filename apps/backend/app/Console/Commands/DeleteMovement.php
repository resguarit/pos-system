<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CurrentAccountMovement;
use Illuminate\Support\Facades\DB;

class DeleteMovement extends Command
{
    protected $signature = 'current-accounts:delete-movement {movement-id : ID del movimiento a eliminar} {--force : Eliminar sin confirmación}';
    protected $description = 'Eliminar un movimiento de cuenta corriente (solo para corrección de errores)';

    public function handle()
    {
        $movementId = $this->argument('movement-id');
        
        $movement = CurrentAccountMovement::findOrFail($movementId);
        
        $this->info("⚠️  ADVERTENCIA: Estás a punto de eliminar un movimiento de cuenta corriente");
        $this->newLine();
        $this->line("ID: {$movement->id}");
        $this->line("Tipo: {$movement->movementType->name}");
        $this->line("Descripción: {$movement->description}");
        $this->line("Monto: $" . number_format($movement->amount, 2, ',', '.'));
        $this->line("Fecha: {$movement->movement_date?->format('d/m/Y H:i:s')}");
        $this->line("Cuenta: #{$movement->current_account_id}");
        $this->newLine();
        
        if (!$this->option('force') && !$this->confirm('¿Estás seguro de que quieres eliminar este movimiento?', false)) {
            $this->warn('Operación cancelada.');
            return 0;
        }
        
        DB::beginTransaction();
        
        try {
            // Verificar si hay pagos asociados a este movimiento
            $relatedPayments = CurrentAccountMovement::where('current_account_id', $movement->current_account_id)
                ->whereNotNull('metadata')
                ->whereJsonContains('metadata->charge_id', $movement->id)
                ->get();
            
            if ($relatedPayments->isNotEmpty()) {
                $this->error("No se puede eliminar este movimiento porque tiene {$relatedPayments->count()} pago(s) asociado(s).");
                $this->line("Primero debes eliminar o anular los pagos asociados.");
                DB::rollBack();
                return 1;
            }
            
            // Eliminar el movimiento
            $movement->delete();
            
            // Recalcular el balance de la cuenta
            $this->info("Recalculando balance de la cuenta...");
            $this->call('current-accounts:recalculate-balances', [
                '--account-id' => $movement->current_account_id
            ]);
            
            DB::commit();
            
            $this->info("✅ Movimiento eliminado correctamente.");
            $this->info("El balance de la cuenta ha sido recalculado.");
            
            return 0;
            
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("❌ Error al eliminar movimiento: " . $e->getMessage());
            return 1;
        }
    }
}

