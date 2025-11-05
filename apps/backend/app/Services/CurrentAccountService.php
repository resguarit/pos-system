<?php

declare(strict_types=1);

namespace App\Services;

use App\Interfaces\CurrentAccountServiceInterface;
use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use App\Constants\CurrentAccountMovementTypes;
use App\Models\Customer;
use App\Models\MovementType;
use App\Services\SearchService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Exception;

class CurrentAccountService implements CurrentAccountServiceInterface
{
    private SearchService $searchService;

    public function __construct(SearchService $searchService)   
    {
        $this->searchService = $searchService;
    }
    /**
     * Crear una nueva cuenta corriente
     */
    public function createAccount(array $data): CurrentAccount
    {
        $validatedData = $this->validateAccountData($data);
        
        return DB::transaction(function () use ($validatedData) {
            // Verificar que el cliente existe
            $customer = Customer::findOrFail($validatedData['customer_id']);
            
            // Verificar que no existe ya una cuenta corriente para este cliente
            $existingAccount = CurrentAccount::where('customer_id', $validatedData['customer_id'])->first();
            if ($existingAccount) {
                throw new Exception('Ya existe una cuenta corriente para este cliente');
            }
            
            $accountData = [
                'customer_id' => $validatedData['customer_id'],
                'credit_limit' => $validatedData['credit_limit'] ?? null, // NULL = límite infinito
                'current_balance' => 0,
                'status' => 'active',
                'notes' => $validatedData['notes'] ?? null,
                'opened_at' => now(),
            ];
            
            return CurrentAccount::create($accountData);
        });
    }

    /**
     * Obtener cuenta corriente por ID
     */
    public function getAccountById(int $id): ?CurrentAccount
    {
        return CurrentAccount::with(['customer.person', 'movements.movementType'])
            ->find($id);
    }

    /**
     * Obtener cuenta corriente por cliente
     */
    public function getAccountByCustomer(int $customerId): ?CurrentAccount
    {
        return CurrentAccount::with(['customer.person', 'movements.movementType'])
            ->where('customer_id', $customerId)
            ->first();
    }

    /**
     * Obtener todas las cuentas corrientes con filtros
     * Refactorizado siguiendo principios SOLID
     */
    public function getAllAccounts(array $filters = []): Collection
    {
        $query = CurrentAccount::with(['customer.person']);
        
        // Aplicar filtros usando el SearchService
        $this->applyFilters($query, $filters);
        
        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Aplicar filtros a la consulta
     * Método privado siguiendo Single Responsibility Principle
     */
    private function applyFilters($query, array $filters): void
    {
        // Filtros de estado
        $this->searchService->applyStatusFilters($query, $filters, ['status']);
        
        // Filtros de rango numérico
        $this->searchService->applyRangeFilters($query, $filters, [
            'current_balance',
            'credit_limit'
        ]);
        
        // Filtros específicos de balance
        if (isset($filters['balance_filter'])) {
            switch ($filters['balance_filter']) {
                case 'positive':
                    // Con crédito disponible = cuentas con crédito infinito (credit_limit = NULL)
                    $query->whereNull('credit_limit');
                    break;
                case 'at_limit':
                    // Cuentas al límite: current_balance >= credit_limit y credit_limit no es NULL
                    $query->whereNotNull('credit_limit')
                          ->whereRaw('current_balance >= credit_limit');
                    break;
                case 'overdrawn':
                    // Cuentas sobregiradas: current_balance > credit_limit y credit_limit no es NULL
                    $query->whereNotNull('credit_limit')
                          ->whereRaw('current_balance > credit_limit');
                    break;
                case 'negative':
                    // Con deuda: current_balance > 0 (incluye todos los movimientos)
                    $query->where('current_balance', '>', 0);
                    break;
            }
        }
        
        // Si se especifica min_current_balance directamente, usar solo balance
        if (isset($filters['min_current_balance']) && !isset($filters['balance_filter'])) {
            $minBalance = (float)$filters['min_current_balance'];
            if ($minBalance > 0) {
                $query->where('current_balance', '>=', $minBalance);
            }
        }
        
        // Filtros específicos
        if (isset($filters['customer_id'])) {
            $query->where('customer_id', $filters['customer_id']);
        }
        
        // Búsqueda de texto
        if (isset($filters['search']) && !empty($filters['search'])) {
            $this->searchService->applyTextSearch(
                $query,
                $filters['search'],
                ['first_name', 'last_name'],
                'customer.person'
            );
        }
    }

    /**
     * Obtener cuentas corrientes paginadas
     * Refactorizado para usar el SearchService
     */
    public function getAccountsPaginated(Request $request): LengthAwarePaginator
    {
        $query = CurrentAccount::with(['customer.person']);
        
        // Convertir Request a array para usar el método applyFilters
        $filters = $request->all();
        $this->applyFilters($query, $filters);
        
        $perPage = $request->input('per_page', 15);
        
        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * Actualizar cuenta corriente
     */
    public function updateAccount(int $id, array $data): CurrentAccount
    {
        $validatedData = $this->validateAccountData($data, $id);
        
        return DB::transaction(function () use ($id, $validatedData) {
            $account = CurrentAccount::findOrFail($id);
            
            // Preparar datos de actualización
            $updateData = [];
            
            // credit_limit puede ser null (límite infinito), usar array_key_exists
            if (array_key_exists('credit_limit', $validatedData)) {
                $updateData['credit_limit'] = $validatedData['credit_limit'];
            }
            
            if (array_key_exists('notes', $validatedData)) {
                $updateData['notes'] = $validatedData['notes'];
            }
            
            if (!empty($updateData)) {
                $account->update($updateData);
            }
            
            return $account->fresh(['customer.person']);
        });
    }

    /**
     * Eliminar cuenta corriente (soft delete)
     */
    public function deleteAccount(int $id): bool
    {
        $account = CurrentAccount::findOrFail($id);
        
        if ($account->current_balance != 0) {
            throw new Exception('No se puede eliminar una cuenta corriente con balance diferente a cero');
        }
        
        return $account->delete();
    }

    /**
     * Suspender cuenta corriente
     */
    public function suspendAccount(int $id, string $reason = null): CurrentAccount
    {
        return DB::transaction(function () use ($id, $reason) {
            $account = CurrentAccount::findOrFail($id);
            $account->suspend($reason);
            return $account->fresh(['customer.person']);
        });
    }

    /**
     * Reactivar cuenta corriente
     */
    public function reactivateAccount(int $id): CurrentAccount
    {
        return DB::transaction(function () use ($id) {
            $account = CurrentAccount::findOrFail($id);
            $account->reactivate();
            return $account->fresh(['customer.person']);
        });
    }

    /**
     * Cerrar cuenta corriente
     */
    public function closeAccount(int $id, string $reason = null): CurrentAccount
    {
        return DB::transaction(function () use ($id, $reason) {
            $account = CurrentAccount::findOrFail($id);
            
            if ($account->current_balance != 0) {
                $balance = (float) $account->current_balance;
                $balanceFormatted = number_format(abs($balance), 2, ',', '.');
                $debtOrCredit = $balance < 0 ? 'deuda' : 'saldo a favor';
                throw new Exception("No se puede cerrar. Hay {$debtOrCredit} de \${$balanceFormatted}. Debe estar en \$0.");
            }
            
            $account->close($reason);
            return $account->fresh(['customer.person']);
        });
    }

    /**
     * Crear movimiento en cuenta corriente
     * 
     * Aplica principios SOLID:
     * - Single Responsibility: Delega validación y cálculo a clases especializadas
     * - Dependency Inversion: Usa abstracciones (BalanceCalculator, AccountOperationValidator)
     */
    public function createMovement(array $data): CurrentAccountMovement
    {
        $validatedData = $this->validateMovementData($data);
        
        return DB::transaction(function () use ($validatedData) {
            $account = CurrentAccount::findOrFail($validatedData['current_account_id']);
            $movementType = MovementType::findOrFail($validatedData['movement_type_id']);
            
            // Validar operación usando clase especializada
            $validator = new \App\Services\CurrentAccount\AccountOperationValidator();
            $validator->validateOperation(
                $account, 
                (float) $validatedData['amount'], 
                $movementType->operation_type
            );
            
            // Calcular balance usando clase especializada
            $balanceCalculator = new \App\Services\CurrentAccount\BalanceCalculator();
            $balanceBefore = (float) $account->current_balance;
            $balanceAfter = $balanceCalculator->calculateNewBalanceFromMovementType(
                $balanceBefore,
                (float) $validatedData['amount'],
                $movementType
            );
            
            // IMPORTANTE: Si el balance vuelve a ser negativo después de un pago y hubo crédito a favor usado,
            // debemos ajustar el balance para reflejar el crédito restante después de consumir el crédito usado
            if ($balanceAfter < 0 && isset($validatedData['sale_id']) && $validatedData['sale_id']) {
                // Buscar si hay un movimiento de crédito a favor para esta venta
                $creditMovement = CurrentAccountMovement::where('sale_id', $validatedData['sale_id'])
                    ->where('current_account_id', $validatedData['current_account_id'])
                    ->whereHas('movementType', function($q) {
                        $q->whereIn('name', [
                            \App\Constants\CurrentAccountMovementTypes::ACCOUNT_PAYMENT,
                            \App\Constants\CurrentAccountMovementTypes::CREDIT_USAGE
                        ])
                        ->where('operation_type', 'entrada');
                    })
                    ->first();
                
                if ($creditMovement && isset($creditMovement->metadata['credit_remaining_after_use'])) {
                    $creditRemaining = (float) $creditMovement->metadata['credit_remaining_after_use'];
                    // El balance negativo debería reflejar el crédito restante después de consumir el crédito usado
                    // Por ejemplo: si había -$11,121 y se usaron $10,000, el crédito restante es -$1,121
                    // Cuando el balance vuelve a ser negativo, debería ser -$1,121, no -$11,121
                    $balanceAfter = -$creditRemaining;
                }
            }
            
            $balanceChange = $balanceAfter - $balanceBefore;
            
            $movementData = [
                'current_account_id' => $validatedData['current_account_id'],
                'movement_type_id' => $validatedData['movement_type_id'],
                'amount' => $validatedData['amount'],
                'description' => $validatedData['description'],
                'reference' => $validatedData['reference'] ?? null,
                'sale_id' => $validatedData['sale_id'] ?? null,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'metadata' => $validatedData['metadata'] ?? null,
                'user_id' => auth()->id(),
                'movement_date' => $validatedData['movement_date'] ?? now(),
            ];
            
            $movement = CurrentAccountMovement::create($movementData);
            
            // Actualizar el balance de la cuenta
            $account->updateBalance($balanceChange);
            
            // Si es "Depósito a cuenta", crear también movimiento de caja
            if (strtolower($movementType->name) === 'depósito a cuenta') {
                $this->createCashMovementForDeposit($movement, $validatedData);
            }
            
            return $movement->load(['movementType', 'user.person']);
        });
    }
    
    /**
     * Crear movimiento de caja para depósito a cuenta
     */
    private function createCashMovementForDeposit(CurrentAccountMovement $movement, array $data): void
    {
        $cashRegisterId = $data['cash_register_id'] ?? null;
        $paymentMethodId = $data['payment_method_id'] ?? null;
        
        // Si no hay cash_register_id o payment_method_id, no crear movimiento de caja
        // (pero el movimiento de cuenta corriente ya se creó)
        if (!$cashRegisterId || !$paymentMethodId) {
            Log::warning('Depósito a cuenta sin caja o método de pago', [
                'movement_id' => $movement->id,
                'cash_register_id' => $cashRegisterId,
                'payment_method_id' => $paymentMethodId
            ]);
            return;
        }
        
        // Verificar que la caja existe y está abierta
        $cashRegister = \App\Models\CashRegister::find($cashRegisterId);
        if (!$cashRegister || $cashRegister->status !== 'open') {
            Log::warning('Caja no encontrada o cerrada para depósito', [
                'movement_id' => $movement->id,
                'cash_register_id' => $cashRegisterId
            ]);
            return;
        }
        
        // Buscar tipo de movimiento de caja para "Pago de cuenta corriente"
        $cashMovementType = MovementType::where('name', 'Pago de cuenta corriente')
            ->where('operation_type', 'entrada')
            ->where('is_cash_movement', true)
            ->first();
        
        // Si no existe, usar el primero disponible de entrada
        if (!$cashMovementType) {
            $cashMovementType = MovementType::where('operation_type', 'entrada')
                ->where('is_cash_movement', true)
                ->first();
        }
        
        if (!$cashMovementType) {
            Log::error('No se encontró tipo de movimiento de caja para depósito', [
                'movement_id' => $movement->id
            ]);
            return;
        }
        
        // Crear movimiento de caja
        \App\Models\CashMovement::create([
            'cash_register_id' => $cashRegisterId,
            'movement_type_id' => $cashMovementType->id,
            'payment_method_id' => $paymentMethodId,
            'amount' => $movement->amount,
            'description' => "Depósito a cuenta corriente: {$movement->description}",
            'reference_type' => 'current_account_movement',
            'reference_id' => $movement->id,
            'user_id' => auth()->id(),
        ]);
        
        Log::info('Movimiento de caja creado para depósito a cuenta', [
            'movement_id' => $movement->id,
            'cash_register_id' => $cashRegisterId,
            'amount' => $movement->amount
        ]);
    }

    /**
     * Obtener movimientos de una cuenta corriente
     */
    public function getAccountMovements(int $accountId, Request $request): LengthAwarePaginator
    {
        $query = CurrentAccountMovement::with([
            'movementType',
            'user.person',
            'sale'
        ])
            ->where('current_account_id', $accountId);
        
        // Aplicar filtros
        if ($request->has('from_date')) {
            $query->whereDate('movement_date', '>=', $request->input('from_date'));
        }
        
        if ($request->has('to_date')) {
            $query->whereDate('movement_date', '<=', $request->input('to_date'));
        }
        
        if ($request->has('movement_type_id')) {
            $query->where('movement_type_id', $request->input('movement_type_id'));
        }
        
        if ($request->has('operation_type')) {
            $query->whereHas('movementType', function($q) use ($request) {
                $q->where('operation_type', $request->input('operation_type'));
            });
        }
        
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%");
            });
        }
        
        $perPage = $request->input('per_page', 15);
        
        return $query->orderBy('movement_date', 'desc')->paginate($perPage);
    }

    /**
     * Obtener balance de cuenta corriente
     */
    public function getAccountBalance(int $accountId): float
    {
        $account = CurrentAccount::findOrFail($accountId);
        return $account->current_balance;
    }

    /**
     * Procesar pago en cuenta corriente con soporte para pagos por venta
     */
    public function processPayment(int $accountId, array $paymentData): array
    {
        return DB::transaction(function () use ($accountId, $paymentData) {
            $account = CurrentAccount::with('customer')->findOrFail($accountId);
            
            if (!$account->isActive()) {
                $statusText = $account->status === 'suspended' ? 'suspendida' : 'cerrada';
                throw new Exception("Cuenta corriente {$statusText}. No se puede operar.");
            }
            
            $salePayments = $paymentData['sale_payments'] ?? [];
            $paymentMethodId = $paymentData['payment_method_id'] ?? null;
            $totalAmount = 0;
            $processedSales = [];
            $paymentsByBranch = []; // Agrupar pagos por sucursal
            
            // Obtener tipo de movimiento para cuenta corriente (una sola vez)
            $movementType = MovementType::where('operation_type', 'entrada')
                ->where('is_current_account_movement', true)
                ->first();
            
            if (!$movementType) {
                throw new Exception('No se encontró un tipo de movimiento válido para pagos');
            }
            
            // Procesar cada venta
            foreach ($salePayments as $salePayment) {
                $sale = \App\Models\SaleHeader::with('branch')->findOrFail($salePayment['sale_id']);
                $paymentAmount = (float)$salePayment['amount'];
                
                // Validar que no exceda el monto pendiente
                if ($paymentAmount > $sale->pending_amount) {
                    throw new Exception("El pago de \${$paymentAmount} excede el monto pendiente de \${$sale->pending_amount} para la venta #{$sale->receipt_number}");
                }
                
                if ($paymentAmount <= 0) {
                    throw new Exception("El monto debe ser mayor a 0 para la venta #{$sale->receipt_number}");
                }
                
                // Registrar pago en la venta
                $sale->recordPayment($paymentAmount);
                
                // Crear movimiento en cuenta corriente
                $this->createMovement([
                    'current_account_id' => $accountId,
                    'movement_type_id' => $movementType->id,
                    'amount' => $paymentAmount,
                    'description' => "Pago de venta #{$sale->receipt_number}",
                    'reference' => $sale->receipt_number,
                    'sale_id' => $sale->id,
                    'user_id' => auth()->id(),
                ]);
                
                // Agrupar por sucursal para registrar en caja
                $branchId = $sale->branch_id;
                if (!isset($paymentsByBranch[$branchId])) {
                    $paymentsByBranch[$branchId] = [
                        'amount' => 0,
                        'sales' => []
                    ];
                }
                $paymentsByBranch[$branchId]['amount'] += $paymentAmount;
                $paymentsByBranch[$branchId]['sales'][] = $sale->receipt_number;
                
                $totalAmount += $paymentAmount;
                $processedSales[] = [
                    'sale_id' => $sale->id,
                    'receipt_number' => $sale->receipt_number,
                    'amount_paid' => $paymentAmount,
                    'new_status' => $sale->payment_status,
                    'branch_id' => $branchId
                ];
            }
            
            // Registrar en caja por cada sucursal si hay método de pago
            if ($paymentMethodId && $totalAmount > 0) {
                // Obtener el método de pago para usar su nombre
                $paymentMethod = \App\Models\PaymentMethod::find($paymentMethodId);
                $paymentMethodName = $paymentMethod ? $paymentMethod->name : 'Desconocido';
                
                // Buscar tipo de movimiento genérico de entrada para caja (no el de "efectivo")
                $cashMovementType = MovementType::where('operation_type', 'entrada')
                    ->where('is_cash_movement', true)
                    ->where('name', 'Pago de cuenta corriente')
                    ->first();
                
                // Si no existe, usar el primero disponible
                if (!$cashMovementType) {
                    $cashMovementType = MovementType::where('operation_type', 'entrada')
                        ->where('is_cash_movement', true)
                        ->first();
                }
                
                if (!$cashMovementType) {
                    Log::error('No se encontró tipo de movimiento de caja');
                    throw new Exception('No se encontró un tipo de movimiento válido para registrar en caja');
                }
                
                foreach ($paymentsByBranch as $branchId => $branchData) {
                    // Cargar sucursal para mensajes de error
                    $branch = \App\Models\Branch::find($branchId);
                    $branchName = $branch ? $branch->description : "ID {$branchId}";
                    
                    Log::info('Procesando pago en caja para sucursal', [
                        'branch_id' => $branchId,
                        'branch_name' => $branchName,
                        'amount' => $branchData['amount'],
                        'payment_method_id' => $paymentMethodId,
                        'user_id' => auth()->id()
                    ]);
                    
                    // Buscar caja abierta en esta sucursal
                    $cashRegister = \App\Models\CashRegister::where('status', 'open')
                        ->where('branch_id', $branchId)
                        ->where('user_id', auth()->id())
                        ->first();
                    
                    // Si no hay caja del usuario, buscar cualquier caja abierta de la sucursal
                    if (!$cashRegister) {
                        $cashRegister = \App\Models\CashRegister::where('status', 'open')
                            ->where('branch_id', $branchId)
                            ->first();
                    }
                    
                    if (!$cashRegister) {
                        Log::error('No hay caja abierta en la sucursal', [
                            'branch_id' => $branchId,
                            'branch_name' => $branchName
                        ]);
                        throw new Exception("No hay ninguna caja abierta en la sucursal '{$branchName}' para procesar el pago. Debe abrir una caja primero.");
                    }
                    
                    Log::info('Caja encontrada', [
                        'cash_register_id' => $cashRegister->id,
                        'branch_id' => $branchId
                    ]);
                    
                    $salesList = implode(', ', $branchData['sales']);
                    $cashMovement = \App\Models\CashMovement::create([
                        'cash_register_id' => $cashRegister->id,
                        'movement_type_id' => $cashMovementType->id,
                        'payment_method_id' => $paymentMethodId,
                        'amount' => $branchData['amount'],
                        'description' => "Ingreso por venta realizada en {$paymentMethodName} - Ventas: {$salesList}",
                        'user_id' => auth()->id(),
                    ]);
                    
                    Log::info('Movimiento de caja creado', [
                        'cash_movement_id' => $cashMovement->id,
                        'branch_id' => $branchId,
                        'amount' => $branchData['amount']
                    ]);
                }
            } else {
                Log::warning('No se registró en caja', [
                    'payment_method_id' => $paymentMethodId,
                    'total_amount' => $totalAmount
                ]);
            }
            
            return [
                'total_amount' => $totalAmount,
                'sales_processed' => $processedSales,
                'account_balance' => $account->fresh()->current_balance,
            ];
        });
    }

    /**
     * Procesar compra a crédito
     */
    public function processCreditPurchase(int $accountId, array $purchaseData): CurrentAccountMovement
    {
        $validatedData = Validator::make($purchaseData, [
            'amount' => 'required|numeric|min:0.01',
            'description' => 'required|string|max:500',
            'movement_type_id' => 'nullable|exists:movement_types,id',
            'sale_id' => 'nullable|exists:sales_header,id',
            'reference' => 'nullable|string|max:100',
            'metadata' => 'nullable|array',
        ])->validate();
        
        // Verificar crédito disponible
        if (!$this->checkAvailableCredit($accountId, (float) $validatedData['amount'])) {
            throw new Exception('No hay crédito disponible para realizar esta compra');
        }
        
        // Buscar tipo de movimiento de compra si no se especifica
        if (!isset($validatedData['movement_type_id'])) {
            $purchaseType = MovementType::where('name', 'like', '%compra%')
                ->where('operation_type', 'salida')
                ->where('is_current_account_movement', true)
                ->first();
            
            if (!$purchaseType) {
                throw new Exception('No se encontró un tipo de movimiento para compras');
            }
            
            $validatedData['movement_type_id'] = $purchaseType->id;
        }
        
        $validatedData['current_account_id'] = $accountId;
        
        return $this->createMovement($validatedData);
    }

    /**
     * Obtener crédito a favor disponible (balance negativo)
     * 
     * @param int $accountId ID de la cuenta corriente
     * @return float Crédito disponible (si balance es negativo, retorna el valor absoluto, sino 0)
     */
    public function getAvailableFavorCredit(int $accountId): float
    {
        $account = CurrentAccount::findOrFail($accountId);
        $balance = (float) $account->current_balance;
        
        // Si el balance es negativo, el cliente tiene crédito a favor
        // Retornar el valor absoluto del balance negativo
        return $balance < 0 ? abs($balance) : 0.0;
    }

    /**
     * Aplicar crédito a favor a una venta
     * 
     * @param int $accountId ID de la cuenta corriente
     * @param int $saleId ID de la venta
     * @param float $amount Monto del crédito a aplicar (no puede exceder el crédito disponible)
     * @param float|null $availableCredit Crédito disponible previamente calculado (opcional, se recalcula si es null)
     * @return CurrentAccountMovement Movimiento creado
     * @throws \Exception Si el monto es inválido o excede el crédito disponible
     */
    public function applyFavorCreditToSale(int $accountId, int $saleId, float $amount, ?float $availableCredit = null): CurrentAccountMovement
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('El monto a aplicar debe ser mayor a 0');
        }

        $account = CurrentAccount::findOrFail($accountId);
        
        // Si no se proporciona el crédito disponible, calcularlo
        // PERO esto puede ser incorrecto si la venta ya se registró
        if ($availableCredit === null) {
            $availableCredit = $this->getAvailableFavorCredit($accountId);
        }
        
        if ($amount > $availableCredit) {
            throw new \InvalidArgumentException(
                sprintf(
                    'El monto a aplicar ($%.2f) excede el crédito disponible ($%.2f)',
                    $amount,
                    $availableCredit
                )
            );
        }
        
        // Buscar tipo de movimiento "Pago de cuenta corriente" para mantener consistencia con otros pagos
        // Si no existe, buscar "Uso de crédito a favor" como fallback
        $creditUsageType = MovementType::where('name', CurrentAccountMovementTypes::ACCOUNT_PAYMENT)
            ->where('operation_type', 'entrada')
            ->where('is_current_account_movement', true)
            ->where('active', true)
            ->first();
        
        // Fallback al tipo específico de crédito a favor si no existe el genérico
        if (!$creditUsageType) {
            $creditUsageType = MovementType::where('name', CurrentAccountMovementTypes::CREDIT_USAGE)
                ->where('operation_type', 'entrada')
                ->where('is_current_account_movement', true)
                ->where('active', true)
                ->first();
        }
        
        if (!$creditUsageType) {
            throw new \RuntimeException(
                'Tipo de movimiento para crédito a favor no encontrado. Ejecuta el seeder de tipos de movimiento.'
            );
        }
        
        // Obtener información de la venta para la descripción
        $sale = \App\Models\SaleHeader::find($saleId);
        $saleNumber = $sale ? $sale->receipt_number : "Venta #{$saleId}";
        
        // IMPORTANTE: El crédito a favor debe consumirse del crédito original
        // Si el balance actual es positivo (deuda), el crédito reduce la deuda normalmente
        // Pero si el balance es negativo (crédito a favor), el crédito usado debe consumirse del crédito original
        // Para lograr esto, necesitamos crear un movimiento especial que ajuste el balance para reflejar el crédito consumido
        
        return DB::transaction(function () use ($accountId, $creditUsageType, $amount, $saleNumber, $saleId, $account, $availableCredit) {
            // Obtener el balance actual antes de aplicar el crédito
            $account->refresh();
            $balanceBefore = (float) $account->current_balance;
            
            // IMPORTANTE: El crédito a favor debe consumirse del crédito original
            // Si el balance actual es positivo (deuda), el crédito reduce la deuda normalmente
            // Pero necesitamos guardar cuánto crédito original había para que cuando el balance vuelva a ser negativo,
            // refleje el crédito restante después de consumir el crédito usado
            
            // Si hay deuda (balance positivo), reducirla normalmente
            // Si hay crédito (balance negativo), consumirlo
            $balanceAfter = $balanceBefore > 0 
                ? $balanceBefore - $amount  // Reducir deuda: 269379 - 10000 = 259379
                : $balanceBefore + $amount; // Consumir crédito: -11121 + 10000 = -1121
            
            $balanceChange = $balanceAfter - $balanceBefore;
            
            // Guardar el crédito original disponible en los metadatos para referencia futura
            // Esto nos permitirá ajustar el balance cuando vuelva a ser negativo
            $metadata = [
                'sale_id' => $saleId,
                'receipt_number' => $saleNumber,
                'credit_applied' => $amount,
                'payment_method' => 'Crédito a favor',
                'applied_at' => now()->toDateTimeString(),
                'original_credit_available' => $availableCredit,
                'credit_remaining_after_use' => max(0, $availableCredit - $amount)
            ];
            
            // Crear el movimiento manualmente para tener control sobre el cálculo del balance
            $movement = CurrentAccountMovement::create([
                'current_account_id' => $accountId,
                'movement_type_id' => $creditUsageType->id,
                'amount' => $amount,
                'description' => "Pago de venta #{$saleNumber} - Crédito a favor",
                'reference' => $saleNumber,
                'sale_id' => $saleId,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'metadata' => $metadata,
                'user_id' => auth()->id(),
                'movement_date' => now(),
            ]);
            
            // Actualizar el balance de la cuenta
            $account->updateBalance($balanceChange);
            
            return $movement->load(['movementType', 'user.person']);
        });
    }

    /**
     * Verificar si hay crédito disponible
     */
    public function checkAvailableCredit(int $accountId, float $amount): bool
    {
        $account = CurrentAccount::findOrFail($accountId);
        return $account->hasAvailableCredit($amount);
    }

    /**
     * Obtener estadísticas de cuenta corriente
     */
    public function getAccountStatistics(int $accountId): array
    {
        $account = CurrentAccount::findOrFail($accountId);
        
        $from = now()->subDays(30);
        $to = now();
        
        $totalInflows = $account->getTotalInflows($from, $to);
        $totalOutflows = $account->getTotalOutflows($from, $to);
        
        return [
            'account_id' => $accountId,
            'current_balance' => $account->current_balance,
            'credit_limit' => $account->credit_limit,
            'available_credit' => $account->available_credit,
            'credit_usage_percentage' => $account->credit_usage_percentage,
            'status' => $account->status,
            'status_text' => $account->status_text,
            'last_movement_at' => $account->last_movement_at,
            'total_movements_30_days' => $account->movementsByDateRange($from, $to)->count(),
            'total_inflows_30_days' => $totalInflows,
            'total_outflows_30_days' => $totalOutflows,
            'net_movement_30_days' => $totalInflows - $totalOutflows,
        ];
    }

    /**
      * Obtener estadísticas generales de cuentas corrientes
      */
    public function getGeneralStatistics(): array
    {
        $totalAccounts = CurrentAccount::count();
        $activeAccounts = CurrentAccount::active()->count();
        $suspendedAccounts = CurrentAccount::suspended()->count();
        $closedAccounts = CurrentAccount::closed()->count();
        $atLimitAccounts = 0; // Lo calcularemos más adelante basado en ventas reales
        
        // Calcular límites de crédito (NULL = infinito)
        $accountsWithLimit = CurrentAccount::whereNotNull('credit_limit')->get();
        $accountsWithInfiniteLimit = CurrentAccount::whereNull('credit_limit')->count();

        $totalCreditLimit = $accountsWithLimit->sum('credit_limit');
        
        // Calcular total pendiente basado en current_balance (incluye TODOS los movimientos)
        // Esto es necesario porque puede haber movimientos manuales (ajustes, notas de crédito/débito)
        // que no son ventas pendientes pero sí afectan el balance
        $allCustomersWithAccounts = CurrentAccount::with('customer.person')->get();
        $totalPendingDebt = 0;
        $customersWithDebt = 0;
        $clientWithHighestDebt = null;
        $highestDebtAmount = 0;
        
        foreach ($allCustomersWithAccounts as $account) {
            // Usar el balance real de la cuenta corriente (incluye todos los movimientos)
            // IMPORTANTE: En este sistema, balance POSITIVO = el cliente debe dinero (deuda)
            // Balance negativo = el cliente tiene saldo a favor
            $currentBalance = (float)($account->current_balance ?? 0);
            
            // Solo contar si hay deuda real (balance positivo = deuda)
            if ($currentBalance > 0) {
                $customersWithDebt++;
                $totalPendingDebt += $currentBalance;
                
                // Verificar si es el cliente con mayor deuda
                if ($currentBalance > $highestDebtAmount) {
                    $highestDebtAmount = $currentBalance;
                    $clientWithHighestDebt = $account;
                }
            }
        }

        // Si hay cuentas con límite infinito, el total también es infinito
        $hasInfiniteLimit = $accountsWithInfiniteLimit > 0;

        // CORRECCIÓN: Calcular correctamente el total_available_credit
        // Debe ser la suma de los créditos disponibles individuales, no totalCreditLimit - totalCurrentBalance
        $totalAvailableCredit = 0;
        if ($hasInfiniteLimit) {
            // Si hay cuentas con límite infinito, el total disponible también es infinito
            $totalAvailableCredit = null;
        } else {
            // Para cuentas con límite definido, calcular suma de créditos disponibles individuales
            $totalAvailableCredit = CurrentAccount::whereNotNull('credit_limit')
                ->get()
                ->sum(function ($account) {
                    // Usar current_balance real (positivo = deuda, negativo = saldo a favor)
                    $currentBalance = (float)($account->current_balance ?? 0);
                    $debt = $currentBalance > 0 ? $currentBalance : 0; // Solo deuda si es positivo
                    
                    return max(0, $account->credit_limit - $debt);
                });
        }

        return [
            'total_accounts' => $totalAccounts,
            'active_accounts' => $activeAccounts,
            'suspended_accounts' => $suspendedAccounts,
            'closed_accounts' => $closedAccounts,
            'overdrawn_accounts' => $customersWithDebt, // Clientes con deuda real
            'at_limit_accounts' => $atLimitAccounts,
            'total_credit_limit' => $hasInfiniteLimit ? null : $totalCreditLimit,
            'total_current_balance' => $totalPendingDebt, // Total de deuda real basado en current_balance
            'total_available_credit' => $totalAvailableCredit,
            'average_credit_limit' => $hasInfiniteLimit ? null : ($totalAccounts > 0 ? $totalCreditLimit / $totalAccounts : 0),
            'average_current_balance' => $totalAccounts > 0 ? $totalPendingDebt / $totalAccounts : 0,
            'client_with_highest_debt' => $clientWithHighestDebt ? [
                'name' => $clientWithHighestDebt->customer->person->first_name . ' ' . $clientWithHighestDebt->customer->person->last_name,
                'debt_amount' => $highestDebtAmount
            ] : null,
        ];
    }

    /**
     * Obtener cuentas corrientes por estado
     */
    public function getAccountsByStatus(string $status): Collection
    {
        return CurrentAccount::with(['customer.person'])
            ->where('status', $status)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Obtener cuentas corrientes con límite de crédito alcanzado
     */
    public function getAccountsAtCreditLimit(): Collection
    {
        return CurrentAccount::with(['customer.person'])
            ->atCreditLimit()
            ->orderBy('current_balance', 'desc')
            ->get();
    }

    /**
     * Obtener cuentas corrientes con deuda (balance negativo)
     */
    public function getOverdrawnAccounts(): Collection
    {
        return CurrentAccount::with(['customer.person'])
            ->overdrawn()
            ->orderBy('current_balance', 'asc')
            ->get();
    }

    /**
     * Obtener movimientos por rango de fechas
     */
    public function getMovementsByDateRange(int $accountId, Carbon $from, Carbon $to): Collection
    {
        return CurrentAccountMovement::with(['movementType', 'user.person', 'sale'])
            ->where('current_account_id', $accountId)
            ->whereBetween('movement_date', [$from, $to])
            ->orderBy('movement_date', 'desc')
            ->get();
    }

    /**
     * Obtener resumen de movimientos por período
     */
    public function getMovementsSummary(int $accountId, Carbon $from, Carbon $to): array
    {
        $account = CurrentAccount::findOrFail($accountId);
        
        $totalInflows = $account->getTotalInflows($from, $to);
        $totalOutflows = $account->getTotalOutflows($from, $to);
        $movementsCount = $account->movementsByDateRange($from, $to)->count();
        
        return [
            'account_id' => $accountId,
            'period_from' => $from->format('Y-m-d'),
            'period_to' => $to->format('Y-m-d'),
            'total_movements' => $movementsCount,
            'total_inflows' => $totalInflows,
            'total_outflows' => $totalOutflows,
            'net_movement' => $totalInflows - $totalOutflows,
            'average_daily_movement' => $movementsCount > 0 ? ($totalInflows - $totalOutflows) / $from->diffInDays($to) : 0,
        ];
    }

    /**
     * Exportar movimientos de cuenta corriente
     */
    public function exportMovements(int $accountId, Request $request): string
    {
        $movements = $this->getMovementsByDateRange(
            $accountId,
            Carbon::parse($request->input('from_date', now()->subDays(30))),
            Carbon::parse($request->input('to_date', now()))
        );
        
        $csv = "Fecha,Movimiento,Tipo,Monto,Balance Antes,Balance Después,Descripción,Referencia,Usuario\n";
        
        foreach ($movements as $movement) {
            $csv .= sprintf(
                "%s,%s,%s,%.2f,%.2f,%.2f,%s,%s,%s\n",
                $movement->movement_date->format('Y-m-d H:i:s'),
                $movement->movement_type_name,
                $movement->operation_type,
                $movement->amount,
                $movement->balance_before,
                $movement->balance_after,
                $movement->description,
                $movement->reference ?? '',
                $movement->user_name
            );
        }
        
        return $csv;
    }

    /**
     * Obtener historial de cambios de límite de crédito
     */
    public function getCreditLimitHistory(int $accountId): Collection
    {
        // Esta funcionalidad requeriría una tabla separada para el historial
        // Por ahora retornamos una colección vacía
        return collect([]);
    }

    /**
     * Actualizar límite de crédito
     */
    public function updateCreditLimit(int $accountId, float $newLimit, string $reason = null): CurrentAccount
    {
        return DB::transaction(function () use ($accountId, $newLimit, $reason) {
            $account = CurrentAccount::findOrFail($accountId);
            
            $oldLimit = $account->credit_limit;
            $account->credit_limit = $newLimit;
            
            if ($reason) {
                $account->notes = ($account->notes ? $account->notes . "\n" : '') . 
                    "Límite cambiado de {$oldLimit} a {$newLimit}: " . $reason;
            }
            
            $account->save();
            
            return $account->fresh(['customer.person']);
        });
    }

    /**
     * Obtener cuentas corrientes por cliente con información adicional
     */
    public function getCustomerAccountsWithDetails(int $customerId): Collection
    {
        return CurrentAccount::with(['customer.person', 'movements.movementType'])
            ->where('customer_id', $customerId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Validar datos de cuenta corriente antes de crear/actualizar
     */
    public function validateAccountData(array $data, int $id = null): array
    {
        $rules = [
            'customer_id' => 'required|integer|exists:customers,id',
            'credit_limit' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ];
        
        if ($id) {
            $rules['customer_id'] = 'sometimes|integer|exists:customers,id';
        }
        
        return Validator::make($data, $rules)->validate();
    }

    /**
     * Validar datos de movimiento antes de crear
     */
    public function validateMovementData(array $data): array
    {
        $rules = [
            'current_account_id' => 'required|integer|exists:current_accounts,id',
            'movement_type_id' => 'required|integer|exists:movement_types,id',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'required|string|max:500',
            'reference' => 'nullable|string|max:100',
            'sale_id' => 'nullable|integer|exists:sales_header,id',
            'metadata' => 'nullable|array',
            'movement_date' => 'nullable|date',
            'cash_register_id' => 'nullable|integer|exists:cash_registers,id',
            'payment_method_id' => 'nullable|integer|exists:payment_methods,id',
        ];
        
        return Validator::make($data, $rules)->validate();
    }

    /**
     * Obtener cuentas corrientes próximas al límite
     */
    public function getAccountsNearCreditLimit(float $percentage = 80): Collection
    {
        $threshold = $percentage / 100;
        
        return CurrentAccount::with(['customer.person'])
            ->whereRaw("(current_balance / credit_limit) >= ?", [$threshold])
            ->where('status', 'active')
            ->orderByRaw("(current_balance / credit_limit) DESC")
            ->get();
    }

    /**
     * Obtener cuentas corrientes inactivas por tiempo
     */
    public function getInactiveAccounts(int $days = 90): Collection
    {
        $cutoffDate = now()->subDays($days);
        
        return CurrentAccount::with(['customer.person'])
            ->where('status', 'active')
            ->where(function($query) use ($cutoffDate) {
                $query->whereNull('last_movement_at')
                      ->orWhere('last_movement_at', '<', $cutoffDate);
            })
            ->orderBy('last_movement_at', 'asc')
            ->get();
    }

    /**
     * Generar reporte de cuentas corrientes
     */
    public function generateAccountsReport(array $filters = []): array
    {
        $query = CurrentAccount::with(['customer.person']);
        
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        
        if (isset($filters['from_date'])) {
            $query->where('created_at', '>=', $filters['from_date']);
        }
        
        if (isset($filters['to_date'])) {
            $query->where('created_at', '<=', $filters['to_date']);
        }
        
        $accounts = $query->get();
        
        return [
            'total_accounts' => $accounts->count(),
            'total_credit_limit' => $accounts->sum('credit_limit'),
            'total_current_balance' => $accounts->sum('current_balance'),
            'accounts_by_status' => $accounts->groupBy('status')->map->count(),
            'accounts_data' => $accounts->map(function($account) {
                return [
                    'id' => $account->id,
                    'customer_name' => $account->customer->full_name,
                    'credit_limit' => $account->credit_limit,
                    'current_balance' => $account->current_balance,
                    'available_credit' => $account->available_credit,
                    'status' => $account->status,
                    'opened_at' => $account->opened_at,
                    'last_movement_at' => $account->last_movement_at,
                ];
            }),
        ];
    }
}
