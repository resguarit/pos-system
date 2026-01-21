/**
* Procesar pago a proveedor (Reduce la deuda)
*/
public function processSupplierPayment(int $accountId, array $paymentData): CurrentAccountMovement
{
return DB::transaction(function () use ($accountId, $paymentData) {
$account = CurrentAccount::with('supplier')->findOrFail($accountId);

if (!$account->isActive()) {
throw new Exception("Cuenta corriente no activa. No se puede operar.");
}

$amount = (float) ($paymentData['amount'] ?? 0);
$paymentMethodId = $paymentData['payment_method_id'] ?? null;
$cashRegisterId = $paymentData['cash_register_id'] ?? null;

if ($amount <= 0) { throw new Exception("El monto debe ser mayor a 0"); } if (!$paymentMethodId) { throw new
    Exception("Debe especificar un método de pago"); } // Buscar tipo de movimiento: "Pago a Proveedor" (Salida de
    deuda? No, si el balance es positivo (deuda), un pago REDUCE el balance). // Si Payment reduces Debt (Positive
    Balance), it acts as a Credit (Negative Movement)? // Logic: // Purchase (Debt Increase)='entrada' (Positive) ? No.
    // Let's check how PurchaseOrderService registered it.
    // "creates a CurrentAccountMovement record... increasing the current_balance" // So movement was likely Positive.
    // Payment should be Negative (reduce balance). // Type: "Pago a Proveedor" . Operation: 'salida' (Outflow).
    $movementType=MovementType::where('name', 'Pago a Proveedor' ) ->where('is_current_account_movement', true)
    ->first();

    if (!$movementType) {
    // Fallback
    $movementType = MovementType::where('operation_type', 'salida')
    ->where('is_current_account_movement', true)
    ->first();
    }

    if (!$movementType) {
    throw new Exception("No se encontró tipo de movimiento para Pago a Proveedor");
    }

    // Validar caja si es efectivo
    if ($cashRegisterId) {
    $cashRegister = \App\Models\CashRegister::find($cashRegisterId);
    if (!$cashRegister || $cashRegister->status !== 'open') {
    throw new Exception("Caja no válida o cerrada");
    }
    }

    $description = $paymentData['description'] ?? "Pago a proveedor";

    $movement = $this->createMovement([
    'current_account_id' => $accountId,
    'movement_type_id' => $movementType->id,
    'amount' => $amount,
    'description' => $description,
    'user_id' => auth()->id(),
    'cash_register_id' => $cashRegisterId,
    'payment_method_id' => $paymentMethodId,
    'metadata' => [
    'notes' => $paymentData['notes'] ?? null
    ]
    ]);

    // Crear movimiento de caja (Salida de dinero de nuestro negocio)
    // Solo si afecta caja
    if ($cashRegisterId) {
    // Check if payment method affects cash register?
    // Usually Cash methods do.

    // Tipo de movimiento de caja: "Pago a Proveedor" (Salida)
    $cashMovementType = MovementType::where('name', 'Pago a Proveedor')
    ->where('is_cash_movement', true)
    ->where('operation_type', 'salida')
    ->first();

    if (!$cashMovementType) {
    $cashMovementType = MovementType::where('operation_type', 'salida')
    ->where('is_cash_movement', true)
    ->first();
    }

    \App\Models\CashMovement::create([
    'cash_register_id' => $cashRegisterId,
    'movement_type_id' => $cashMovementType->id,
    'payment_method_id' => $paymentMethodId,
    'amount' => $amount,
    'description' => "Pago a proveedor: " . ($account->supplier->name ?? 'Desconocido'),
    'user_id' => auth()->id(),
    'affects_balance' => true
    ]);
    }

    return $movement;
    });
    }