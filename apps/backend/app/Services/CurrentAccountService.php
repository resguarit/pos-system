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
use Illuminate\Support\Collection as SupportCollection;
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
            // Verificar que el cliente o proveedor existe
            if (isset($validatedData['customer_id'])) {
                $customer = Customer::findOrFail($validatedData['customer_id']);
                $exists = CurrentAccount::where('customer_id', $validatedData['customer_id'])->exists();
                if ($exists)
                    throw new Exception('Ya existe una cuenta para este cliente');
            } elseif (isset($validatedData['supplier_id'])) {
                $supplier = \App\Models\Supplier::findOrFail($validatedData['supplier_id']);
                $exists = CurrentAccount::where('supplier_id', $validatedData['supplier_id'])->exists();
                if ($exists)
                    throw new Exception('Ya existe una cuenta para este proveedor');
            } else {
                throw new Exception('Debe especificar customer_id o supplier_id');
            }

            // Verificar que no existe ya una cuenta corriente para este cliente
            if (isset($validatedData['customer_id'])) {
                $existingAccount = CurrentAccount::where('customer_id', $validatedData['customer_id'])->first();
                if ($existingAccount) {
                    throw new Exception('Ya existe una cuenta corriente para este cliente');
                }
            }

            $accountData = [
                'customer_id' => $validatedData['customer_id'] ?? null,
                'supplier_id' => $validatedData['supplier_id'] ?? null,
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
    /**
     * Obtener cuenta corriente por ID
     */
    public function getAccountById(int $id): ?CurrentAccount
    {
        return CurrentAccount::with(['customer.person', 'supplier', 'movements.movementType'])
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
        $query = CurrentAccount::with(['customer.person', 'supplier']);

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
                case 'negative':
                    // Con deuda: tiene ventas pendientes de pago
                    // Incluir todas las ventas EXCEPTO rechazadas
                    // Las ventas anuladas que tengan saldo pendiente también se incluyen
                    $query->whereHas('sales', function ($salesQuery) {
                        $salesQuery->validForDebt()
                            ->pendingDebt()
                            ->whereRaw('(total - COALESCE(paid_amount, 0)) > 0.01');
                    });
                    break;
            }
        }

        // Si se especifica min_current_balance directamente, usar solo balance
        if (isset($filters['min_current_balance']) && !isset($filters['balance_filter'])) {
            $minBalance = (float) $filters['min_current_balance'];
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
                ['first_name', 'last_name', 'phone', 'documento', 'cuit'],
                'customer.person'
            );

            // Also search in suppliers
            $query->orWhereHas('supplier', function ($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['search']}%")
                    ->orWhere('contact_name', 'like', "%{$filters['search']}%")
                    ->orWhere('cuit', 'like', "%{$filters['search']}%");
            });
        }
    }

    /**
     * Obtener cuentas corrientes paginadas
     * Refactorizado para usar el SearchService
     */
    public function getAccountsPaginated(Request $request): LengthAwarePaginator
    {
        $query = CurrentAccount::with(['customer.person', 'supplier']);

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
    public function suspendAccount(int $id, ?string $reason = null): CurrentAccount
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
    public function closeAccount(int $id, ?string $reason = null): CurrentAccount
    {
        return DB::transaction(function () use ($id, $reason) {
            $account = CurrentAccount::findOrFail($id);

            if ($account->current_balance > 0) {
                $balance = (float) $account->current_balance;
                $balanceFormatted = number_format($balance, 2, ',', '.');
                throw new Exception("No se puede cerrar. Hay deuda de \${$balanceFormatted}. Debe estar en \$0.");
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

            // Solo hay saldo adeudado (deuda pendiente), no hay crédito a favor
            // El balance nunca debe ser negativo, así que lo ajustamos a 0 si es negativo
            if ($balanceAfter < 0) {
                $balanceAfter = 0;
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

            // Si viene una caja, inferir sucursal y guardarla en metadata como sucursal del movimiento
            if (!empty($validatedData['cash_register_id'])) {
                $cashRegister = \App\Models\CashRegister::with('branch')->find($validatedData['cash_register_id']);
                if ($cashRegister) {
                    $branch = $cashRegister->branch ?? \App\Models\Branch::find($cashRegister->branch_id);
                    $movementData['metadata'] = array_merge((array) ($movementData['metadata'] ?? []), [
                        'payment_branch_id' => $cashRegister->branch_id,
                        'payment_branch_description' => $branch->description ?? null,
                        'payment_branch_color' => $branch->color ?? null,
                    ]);
                }
            }

            // Si viene un método de pago, guardarlo en metadata
            if (!empty($validatedData['payment_method_id'])) {
                $paymentMethod = \App\Models\PaymentMethod::find($validatedData['payment_method_id']);
                $movementData['metadata'] = array_merge((array) ($movementData['metadata'] ?? []), [
                    'payment_method_id' => $validatedData['payment_method_id'],
                    'payment_method_name' => $paymentMethod->name ?? null,
                ]);
            }

            $movement = CurrentAccountMovement::create($movementData);

            // Los movimientos manuales (Ajuste en contra, Interés aplicado) actualizan el balance
            $account->updateBalance($balanceChange);

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
            return;
        }

        // Verificar que la caja existe y está abierta
        $cashRegister = \App\Models\CashRegister::find($cashRegisterId);
        if (!$cashRegister || $cashRegister->status !== 'open') {
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
    }

    /**
     * Obtener movimientos de una cuenta corriente
     */
    public function getAccountMovements(int $accountId, Request $request): LengthAwarePaginator
    {
        $query = CurrentAccountMovement::with([
            'movementType',
            'user.person',
            'sale.branch'
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
            $query->whereHas('movementType', function ($q) use ($request) {
                $q->where('operation_type', $request->input('operation_type'));
            });
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
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
        return (float) $account->current_balance;
    }

    /**
     * Obtener filtros únicos disponibles para una cuenta corriente
     * Solo devuelve tipos y sucursales que realmente existen en los movimientos de esta cuenta
     */
    public function getMovementFilters(int $accountId): array
    {
        // Validar que la cuenta existe
        CurrentAccount::findOrFail($accountId);

        // Obtener solo los tipos de movimiento que realmente se han usado en esta cuenta
        $movementTypeIds = CurrentAccountMovement::where('current_account_id', $accountId)
            ->select('movement_type_id')
            ->distinct()
            ->pluck('movement_type_id')
            ->filter();

        $movementTypes = MovementType::whereIn('id', $movementTypeIds)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(function ($type) {
                return [
                    'id' => $type->id,
                    'name' => $type->name,
                ];
            })
            ->values();

        // Obtener sucursales únicas desde metadata y relaciones
        $branches = CurrentAccountMovement::where('current_account_id', $accountId)
            ->with('sale.branch:id,description,color')
            ->get()
            ->map(function ($movement) {
                $metadata = is_array($movement->metadata) ? $movement->metadata : [];

                // Priorizar metadata de pago
                if (!empty($metadata['payment_branch_id'])) {
                    return [
                        'id' => (int) $metadata['payment_branch_id'],
                        'name' => $metadata['payment_branch_description'] ?? null,
                        'color' => $metadata['payment_branch_color'] ?? null,
                    ];
                }

                // Usar branch de la venta si existe
                if ($movement->sale && $movement->sale->branch) {
                    return [
                        'id' => $movement->sale->branch->id,
                        'name' => $movement->sale->branch->description,
                        'color' => $movement->sale->branch->color ?? null,
                    ];
                }

                return null;
            })
            ->filter()
            ->unique('id')
            ->sortBy('name')
            ->values();

        return [
            'movement_types' => $movementTypes,
            'branches' => $branches,
        ];
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
            $selectedBranchId = $paymentData['branch_id'] ?? null; // Sucursal seleccionada por el usuario

            $totalAmount = 0;
            $processedSales = [];

            if (!$paymentMethodId) {
                throw new Exception('Debe especificar un método de pago');
            }

            // Validar que se haya seleccionado una sucursal si hay múltiples sucursales disponibles
            if (!$selectedBranchId) {
                // Si no se especificó sucursal, intentar usar la del usuario o buscar una caja abierta
                $userBranchId = auth()->user()->branch_id ?? null;
                if (!$userBranchId) {
                    // Buscar cualquier caja abierta del usuario
                    $userCashRegister = \App\Models\CashRegister::where('status', 'open')
                        ->where('user_id', auth()->id())
                        ->first();
                    if ($userCashRegister) {
                        $selectedBranchId = $userCashRegister->branch_id;
                    }
                } else {
                    $selectedBranchId = $userBranchId;
                }

                if (!$selectedBranchId) {
                    throw new Exception('Debe especificar una sucursal para procesar el pago');
                }
            }

            // Obtener tipo de movimiento para cuenta corriente (una sola vez)
            $movementType = MovementType::where('operation_type', 'entrada')
                ->where('is_current_account_movement', true)
                ->first();

            if (!$movementType) {
                throw new Exception('No se encontró un tipo de movimiento válido para pagos');
            }

            // Procesar cada venta
            $salesList = [];
            foreach ($salePayments as $salePayment) {
                $sale = \App\Models\SaleHeader::with('branch')->findOrFail($salePayment['sale_id']);
                $paymentAmount = (float) $salePayment['amount'];

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
                $paymentMethodName = $paymentMethodId
                    ? optional(\App\Models\PaymentMethod::find($paymentMethodId))->name
                    : null;

                $this->createMovement([
                    'current_account_id' => $accountId,
                    'movement_type_id' => $movementType->id,
                    'amount' => $paymentAmount,
                    'description' => "Pago de venta #{$sale->receipt_number}",
                    'reference' => $sale->receipt_number,
                    'sale_id' => $sale->id,
                    'user_id' => auth()->id(),
                    // Guardar sucursal y método de pago donde se registró el pago
                    'metadata' => [
                        'payment_branch_id' => $selectedBranchId,
                        'payment_branch_description' => optional(\App\Models\Branch::find($selectedBranchId))->description,
                        'payment_branch_color' => optional(\App\Models\Branch::find($selectedBranchId))->color,
                        'payment_method_id' => $paymentMethodId,
                        'payment_method_name' => $paymentMethodName,
                    ],
                ]);

                $totalAmount += $paymentAmount;
                $salesList[] = $sale->receipt_number;
                $processedSales[] = [
                    'sale_id' => $sale->id,
                    'receipt_number' => $sale->receipt_number,
                    'amount_paid' => $paymentAmount,
                    'new_status' => $sale->payment_status,
                    'branch_id' => $selectedBranchId // Usar la sucursal seleccionada
                ];
            }

            // Registrar en caja en la sucursal seleccionada si hay método de pago
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

                // Cargar sucursal para mensajes de error
                $branch = \App\Models\Branch::find($selectedBranchId);
                $branchName = $branch ? $branch->description : "ID {$selectedBranchId}";

                // Buscar caja abierta en la sucursal seleccionada
                $cashRegister = \App\Models\CashRegister::where('status', 'open')
                    ->where('branch_id', $selectedBranchId)
                    ->where('user_id', auth()->id())
                    ->first();

                // Si no hay caja del usuario, buscar cualquier caja abierta de la sucursal
                if (!$cashRegister) {
                    $cashRegister = \App\Models\CashRegister::where('status', 'open')
                        ->where('branch_id', $selectedBranchId)
                        ->first();
                }

                if (!$cashRegister) {
                    Log::error('No hay caja abierta en la sucursal', [
                        'branch_id' => $selectedBranchId,
                        'branch_name' => $branchName
                    ]);
                    throw new Exception("No hay ninguna caja abierta en la sucursal '{$branchName}' para procesar el pago. Debe abrir una caja primero.");
                }

                // Construir descripción del movimiento de caja
                $salesListStr = implode(', ', $salesList);
                $description = "Ingreso por pago de cuenta corriente en {$paymentMethodName} - Ventas: {$salesListStr}";

                $cashMovement = \App\Models\CashMovement::create([
                    'cash_register_id' => $cashRegister->id,
                    'movement_type_id' => $cashMovementType->id,
                    'payment_method_id' => $paymentMethodId,
                    'amount' => $totalAmount,
                    'description' => $description,
                    'user_id' => auth()->id(),
                ]);
            }

            // Refrescar la cuenta para obtener el balance actualizado
            $account->refresh();

            return [
                'total_amount' => $totalAmount,
                'sales_processed' => $processedSales,
                'account_balance' => $account->current_balance,
            ];
        });
    }

    /**
     * Procesar compra a crédito
     */
    public function processCreditPurchase(int $accountId, array $purchaseData): CurrentAccountMovement
    {
        $validatedData = Validator::make($purchaseData, [
            'amount' => 'required|numeric|min:0',
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
        $atLimitAccounts = 0;

        // Calcular límites de crédito (NULL = infinito)
        $accountsWithLimit = CurrentAccount::whereNotNull('credit_limit')->get();
        $accountsWithInfiniteLimit = CurrentAccount::whereNull('credit_limit')->count();
        $totalCreditLimit = $accountsWithLimit->sum('credit_limit');

        // SINGLE SOURCE OF TRUTH: Calcular deuda basada en pending_amount de ventas
        // Esto es consistente con CurrentAccountResource
        $allAccounts = CurrentAccount::with('customer.person')->get();
        $totalPendingDebt = 0;
        $customersWithDebt = 0;
        $clientWithHighestDebt = null;
        $highestDebtAmount = 0;

        foreach ($allAccounts as $account) {
            $accountDebt = 0;

            if ($account->customer_id) {
                $sales = \App\Models\SaleHeader::where('customer_id', $account->customer_id)
                    ->validForDebt()
                    ->pendingDebt()
                    ->get();

                foreach ($sales as $sale) {
                    if ($sale->pending_amount > 0.01) {
                        $accountDebt += $sale->pending_amount;
                    }
                }
            }

            if ($accountDebt > 0.01) {
                $customersWithDebt++;
                $totalPendingDebt += $accountDebt;

                if ($accountDebt > $highestDebtAmount) {
                    $highestDebtAmount = $accountDebt;
                    $clientWithHighestDebt = $account;
                }
            }
        }

        // Si hay cuentas con límite infinito, el total también es infinito
        $hasInfiniteLimit = $accountsWithInfiniteLimit > 0;

        // Calcular el total_available_credit
        $totalAvailableCredit = 0;
        if ($hasInfiniteLimit) {
            $totalAvailableCredit = null;
        } else {
            foreach ($allAccounts as $account) {
                if ($account->credit_limit !== null) {
                    $accountDebt = 0;
                    if ($account->customer_id) {
                        $sales = \App\Models\SaleHeader::where('customer_id', $account->customer_id)
                            ->validForDebt()
                            ->pendingDebt()
                            ->get();
                        foreach ($sales as $sale) {
                            if ($sale->pending_amount > 0.01) {
                                $accountDebt += $sale->pending_amount;
                            }
                        }
                    }
                    $totalAvailableCredit += max(0, (float) $account->credit_limit - $accountDebt);
                }
            }
        }

        return [
            'total_accounts' => $totalAccounts,
            'active_accounts' => $activeAccounts,
            'suspended_accounts' => $suspendedAccounts,
            'closed_accounts' => $closedAccounts,
            'overdrawn_accounts' => $customersWithDebt,
            'at_limit_accounts' => $atLimitAccounts,
            'total_credit_limit' => $hasInfiniteLimit ? null : $totalCreditLimit,
            'total_current_balance' => $totalPendingDebt,
            'total_available_credit' => $totalAvailableCredit,
            'average_credit_limit' => $hasInfiniteLimit ? null : ($totalAccounts > 0 ? $totalCreditLimit / $totalAccounts : 0),
            'average_current_balance' => $totalAccounts > 0 ? $totalPendingDebt / $totalAccounts : 0,
            'client_with_highest_debt' => $clientWithHighestDebt ? [
                'name' => ($clientWithHighestDebt->customer->person->first_name ?? '') . ' ' . ($clientWithHighestDebt->customer->person->last_name ?? ''),
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
    public function updateCreditLimit(int $accountId, float $newLimit, ?string $reason = null): CurrentAccount
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
    public function validateAccountData(array $data, ?int $id = null): array
    {
        $rules = [
            'customer_id' => 'required_without:supplier_id|nullable|integer|exists:customers,id',
            'supplier_id' => 'required_without:customer_id|nullable|integer|exists:suppliers,id',
            'credit_limit' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ];

        if ($id) {
            $rules['customer_id'] = 'sometimes|nullable|integer|exists:customers,id';
            $rules['supplier_id'] = 'sometimes|nullable|integer|exists:suppliers,id';
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
            'amount' => 'required|numeric|min:0',
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
            ->where(function ($query) use ($cutoffDate) {
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
            'accounts_data' => $accounts->map(function ($account) {
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

    /**
     * Obtener cargos administrativos pendientes de pago
     * 
     * Retorna movimientos de débito (Ajuste en contra, Interés aplicado) que:
     * - No están asociados a una venta
     * - No han sido completamente pagados
     * - Son del tipo "salida" (aumentan deuda)
     * 
     * @param int $accountId ID de la cuenta corriente
     * @return SupportCollection Colección de cargos administrativos pendientes con información de pagos
     */


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

            if ($amount <= 0) {
                throw new Exception("El monto debe ser mayor a 0");
            }

            if (!$paymentMethodId) {
                throw new Exception("Debe especificar un método de pago");
            }

            $movementType = MovementType::where('name', 'Pago a Proveedor')
                ->where('is_current_account_movement', true)
                ->first();

            if (!$movementType) {
                // Fallback
                $movementType = MovementType::where('operation_type', 'entrada')
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
            if ($cashRegisterId) {
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

}
