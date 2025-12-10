<?php

namespace App\Listeners;

use App\Events\CashMovementCreated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class UpdateCashRegisterCalculatedFields
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(CashMovementCreated $event): void
    {
        // Actualizar los campos calculados de la caja registradora
        $cashRegister = $event->cashMovement->cashRegister;

        if ($cashRegister && $cashRegister->status === 'open') {
            try {
                $cashRegister->updateCalculatedFields();
            } catch (\Exception $e) {
                // Log error pero no fallar el proceso principal
                Log::error('Error updating cash register calculated fields: ' . $e->getMessage(), [
                    'cash_register_id' => $cashRegister->id,
                    'cash_movement_id' => $event->cashMovement->id
                ]);
            }
        }
    }
}
