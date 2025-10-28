<?php

declare(strict_types=1);

namespace App\Services;

use App\Interfaces\CurrentAccountServiceInterface;
use App\Models\CurrentAccount;
use App\Models\CurrentAccountMovement;
use App\Models\MovementType;
use App\Models\Customer;
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
     */
    public function createMovement(array $data): CurrentAccountMovement
    {
        $validatedData = $this->validateMovementData($data);
        
        return DB::transaction(function () use ($validatedData) {
            $account = CurrentAccount::findOrFail($validatedData['current_account_id']);
            
            // Verificar que la cuenta esté activa
            if (!$account->isActive()) {
                $statusText = $account->status === 'suspended' ? 'suspendida' : 'cerrada';
                throw new Exception("Cuenta corriente {$statusText}. No se puede operar.");
            }
            
            // Verificar límite de crédito para movimientos de salida
            $movementType = MovementType::findOrFail($validatedData['movement_type_id']);
            if ($movementType->operation_type === 'salida' && !$account->hasAvailableCredit((float) $validatedData['amount'])) {
                throw new Exception('No hay crédito disponible para realizar este movimiento');
            }
            
            $balanceBefore = $account->current_balance;
            $amount = $movementType->operation_type === 'entrada' 
                ? $validatedData['amount'] 
                : -$validatedData['amount'];
            $balanceAfter = $balanceBefore + $amount;
            
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
            $account->updateBalance((float) $amount);
            
            return $movement->load(['movementType', 'user.person']);
        });
    }

    /**
     * Obtener movimientos de una cuenta corriente
     */
    public function getAccountMovements(int $accountId, Request $request): LengthAwarePaginator
    {
        $query = CurrentAccountMovement::with(['movementType', 'user.person', 'sale'])
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
        
        // Calcular total pendiente basado en VENTAS PENDIENTES REALES, no en current_balance
        $allCustomersWithAccounts = CurrentAccount::with('customer')->get();
        $totalPendingDebt = 0;
        $customersWithDebt = 0;
        $clientWithHighestDebt = null;
        $highestDebtAmount = 0;
        
        foreach ($allCustomersWithAccounts as $account) {
            // Calcular ventas pendientes reales para cada cliente
            $pendingSales = \App\Models\SaleHeader::where('customer_id', $account->customer_id)
                ->whereIn('payment_status', ['pending', 'partial'])
                ->get();
            
            $customerDebt = 0;
            foreach ($pendingSales as $sale) {
                // pending = total - paid_amount
                $pending = $sale->total - $sale->paid_amount;
                $customerDebt += $pending;
            }
            
            if ($customerDebt > 0) {
                $customersWithDebt++;
                $totalPendingDebt += $customerDebt;
                
                // Verificar si es el cliente con mayor deuda
                if ($customerDebt > $highestDebtAmount) {
                    $highestDebtAmount = $customerDebt;
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
                    // Usar ventas pendientes en lugar de current_balance
                    $pendingSales = \App\Models\SaleHeader::where('customer_id', $account->customer_id)
                        ->whereIn('payment_status', ['pending', 'partial'])
                        ->get();
                    
                    $customerDebt = 0;
                    foreach ($pendingSales as $sale) {
                        $customerDebt += ($sale->total - $sale->paid_amount);
                    }
                    
                    return max(0, $account->credit_limit - $customerDebt);
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
            'total_current_balance' => $totalPendingDebt, // Total de ventas pendientes reales
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
