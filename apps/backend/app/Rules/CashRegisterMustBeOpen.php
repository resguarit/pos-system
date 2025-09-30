<?php

namespace App\Rules;

use App\Services\CashRegisterService;
use Illuminate\Contracts\Validation\Rule;

class CashRegisterMustBeOpen implements Rule
{
    protected $cashRegisterService;
    protected $branchId;

    public function __construct(CashRegisterService $cashRegisterService, $branchId = null)
    {
        $this->cashRegisterService = $cashRegisterService;
        $this->branchId = $branchId;
    }

    /**
     * Determine if the validation rule passes.
     *
     * @param  string  $attribute
     * @param  mixed  $value
     * @return bool
     */
    public function passes($attribute, $value)
    {
        try {
            $branchId = $this->branchId ?? $value ?? 1;
            $currentCashRegister = $this->cashRegisterService->getCurrentCashRegister($branchId);
            
            return $currentCashRegister !== null;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get the validation error message.
     *
     * @return string
     */
    public function message()
    {
        return 'No hay una caja abierta para esta sucursal. Debe abrir la caja antes de realizar esta operación.';
    }
}
