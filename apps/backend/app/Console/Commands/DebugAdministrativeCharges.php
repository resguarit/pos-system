<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use App\Models\MovementType;
use App\Services\CurrentAccountService;

class DebugAdministrativeCharges extends Command
{
    protected $signature = 'current-accounts:debug-charges {account-id : ID de la cuenta corriente}';
    protected $description = 'Depurar los cargos administrativos de una cuenta específica';

    public function handle()
    {
        $accountId = $this->argument('account-id');
        
        $account = CurrentAccount::findOrFail($accountId);
        $service = app(CurrentAccountService::class);
        
        $this->info("🔍 Depurando cargos administrativos para cuenta #{$accountId}");
        $this->newLine();
        
        // Obtener cargos administrativos usando el servicio
        $charges = $service->getAdministrativeCharges($accountId);
        
        $this->info("📋 Cargos administrativos pendientes: " . $charges->count());
        $this->newLine();
        
        if ($charges->isEmpty()) {
            $this->warn("No hay cargos administrativos pendientes.");
        } else {
            foreach ($charges as $charge) {
                $this->line("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                $this->line("ID: {$charge['id']}");
                $this->line("Tipo: {$charge['movement_type']}");
                $this->line("Descripción: {$charge['description']}");
                $this->line("Referencia: " . ($charge['reference'] ?? 'N/A'));
                $this->line("Total: $" . number_format($charge['total_amount'], 2, ',', '.'));
                $this->line("Pagado: $" . number_format($charge['paid_amount'], 2, ',', '.'));
                $this->line("Pendiente: $" . number_format($charge['pending_amount'], 2, ',', '.'));
                $this->line("Fecha: {$charge['movement_date']}");
                $this->line("Estado: {$charge['payment_status']}");
                $this->newLine();
            }
        }
        
        // También verificar movimientos directamente
        $this->info("🔍 Verificando movimientos de débito sin venta asociada:");
        $this->newLine();
        
        $debitTypes = MovementType::where('is_current_account_movement', true)
            ->where('operation_type', 'salida')
            ->whereIn('name', ['Ajuste en contra', 'Interés aplicado'])
            ->pluck('id', 'name')
            ->toArray();
        
        foreach ($debitTypes as $typeName => $typeId) {
            $movements = CurrentAccountMovement::where('current_account_id', $accountId)
                ->where('movement_type_id', $typeId)
                ->whereNull('sale_id')
                ->get();
            
            if ($movements->isNotEmpty()) {
                $this->line("📌 {$typeName}: {$movements->count()} movimiento(s)");
                foreach ($movements as $movement) {
                    $this->line("   • ID: {$movement->id} | Monto: $" . number_format($movement->amount, 2, ',', '.') . " | Fecha: {$movement->movement_date?->format('d/m/Y')} | Descripción: {$movement->description}");
                }
                $this->newLine();
            }
        }
        
        // Calcular total pendiente
        $totalPending = $service->getTotalAdministrativeChargesPending($accountId);
        $this->info("💰 Total de cargos administrativos pendientes: $" . number_format($totalPending, 2, ',', '.'));
        
        return 0;
    }
}

