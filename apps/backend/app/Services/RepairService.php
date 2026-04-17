<?php

namespace App\Services;

use App\Interfaces\RepairServiceInterface;
use App\Models\CashMovement;
use App\Models\CashRegister;
use App\Models\Branch;
use App\Models\CurrentAccount;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\MovementType;
use App\Models\PaymentMethod;
use App\Models\Repair;
use App\Models\RepairNote;
use App\Models\RepairPayment;
use App\Models\SubcontractedService;
use App\Models\SubcontractedServicePayment;
use App\Services\CurrentAccountService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class RepairService implements RepairServiceInterface
{
    private const DEFAULT_IVA_PERCENTAGE = 21.0;
    private const PAYMENT_TOLERANCE = 0.01;

    /**
     * List repairs with pagination
     */
    public function list(array $filters = []): LengthAwarePaginator
    {
        $query = $this->buildQuery($filters);
        return $query->orderByDesc('id')->paginate($filters['per_page'] ?? 15);
    }

    /**
     * List all repairs without pagination (for Kanban view)
     */
    public function listAll(array $filters = []): Collection
    {
        $query = $this->buildQuery($filters);
        return $query->orderByDesc('id')->limit(200)->get();
    }

    /**
     * Build base query with filters
     */
    private function buildQuery(array $filters = [])
    {
        $query = Repair::query()
            ->with(['customer.person', 'branch', 'category', 'technician.person', 'sale', 'insurer', 'insuredCustomer.person', 'payments.paymentMethod', 'subcontractedService.supplier'])
            ->withCount('notes')
            ->addSelect([
                'latest_note_at' => RepairNote::select('created_at')
                    ->whereColumn('repair_id', 'repairs.id')
                    ->latest()
                    ->limit(1),
                'latest_note_user_id' => RepairNote::select('user_id')
                    ->whereColumn('repair_id', 'repairs.id')
                    ->latest()
                    ->limit(1),
            ]);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%$search%")
                    ->orWhere('device', 'like', "%$search%")
                    ->orWhereHas('customer.person', function ($q2) use ($search) {
                        $q2->where(DB::raw("CONCAT(first_name, ' ', last_name)"), 'like', "%$search%")
                            ->orWhere('phone', 'like', "%$search%")
                            ->orWhere('documento', 'like', "%$search%")
                            ->orWhere('cuit', 'like', "%$search%");
                    });
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['statuses'])) {
            $statuses = $filters['statuses'];
            if (is_string($statuses)) {
                $statuses = array_filter(array_map('trim', explode(',', $statuses)));
            }
            if (is_array($statuses) && count($statuses) > 0) {
                $query->whereIn('status', $statuses);
            }
        }

        if (!empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (!empty($filters['technician_id'])) {
            $query->where('technician_id', $filters['technician_id']);
        }

        if (!empty($filters['branch_id']) || !empty($filters['branch_ids'])) {
            $branchIds = $filters['branch_ids'] ?? $filters['branch_id'];
            if (is_string($branchIds)) {
                $branchIds = array_filter(array_map('trim', explode(',', $branchIds)));
            }
            if (is_array($branchIds)) {
                $query->whereIn('branch_id', $branchIds);
            } else {
                $query->where('branch_id', $branchIds);
            }
        }

        if (!empty($filters['insurer_id'])) {
            $query->where('insurer_id', $filters['insurer_id']);
        }

        // Payment filter (is_paid) - accept 1/0, true/false, "true"/"false"
        if (array_key_exists('is_paid', $filters) && $filters['is_paid'] !== null && $filters['is_paid'] !== '') {
            $raw = $filters['is_paid'];
            $normalized = null;
            if ($raw === true || $raw === 1 || $raw === '1' || $raw === 'true' || $raw === 'TRUE') {
                $normalized = true;
            } elseif ($raw === false || $raw === 0 || $raw === '0' || $raw === 'false' || $raw === 'FALSE') {
                $normalized = false;
            }

            if ($normalized !== null) {
                $query->where('is_paid', $normalized);
            }
        }

        // Date range: intake_date (from_date/to_date)
        if (!empty($filters['from_date'])) {
            $query->whereDate('intake_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('intake_date', '<=', $filters['to_date']);
        }

        // Sorting
        if (!empty($filters['sort_by'])) {
            $direction = ($filters['sort_dir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
            $query->orderBy($filters['sort_by'], $direction);
        }

        return $query;
    }

    /**
     * Find a single repair by ID
     */
    public function find(int $id): ?Repair
    {
        return Repair::with([
            'customer.person',
            'branch',
            'category',
            'technician.person',
            'notes.user.person',
            'sale',
            'insurer',
            'insuredCustomer.person',
            'paymentMethod',
            'cashMovement',
            'payments.paymentMethod',
            'subcontractedService.supplier',
            'subcontractedService.payments.paymentMethod',
        ])->find($id);
    }


    public function create(array $data): Repair
    {
        return DB::transaction(function () use ($data) {
            $data['code'] = $data['code'] ?? $this->generateCode();
            $data['status'] = $data['status'] ?? 'Pendiente de recepción';
            $data['intake_date'] = $data['intake_date'] ?? now()->toDateString();
            $data = $this->normalizeRepairPricing($data);

            $repair = Repair::create($data);

            if (!empty($data['initial_notes'])) {
                RepairNote::create([
                    'repair_id' => $repair->id,
                    'user_id' => $data['user_id'] ?? auth()->id(),
                    'note' => $data['initial_notes'],
                ]);
            }

            return $repair;
        });
    }

    public function update(int $id, array $data): Repair
    {
        $repair = Repair::findOrFail($id);
        $data = $this->normalizeRepairPricing($data, $repair);
        $repair->update($data);
        return $repair;
    }

    public function updateStatus(int $id, string $status): Repair
    {
        $repair = Repair::findOrFail($id);

        $wasCancelled = $repair->status === 'Cancelado';
        $wasPaid = (bool) $repair->is_paid;
        $paidAmount = (float) ($repair->amount_paid ?? 0);
        $paidAt = $repair->paid_at;
        $paymentMethodName = $repair->paymentMethod?->name;

        $repair->update(['status' => $status]);

        if ($status === 'Cancelado' && !$wasCancelled) {
            $paidStatusMessage = $wasPaid
                ? 'Estado de cobro al cancelar: COBRADA.'
                : 'Estado de cobro al cancelar: SIN COBRO REGISTRADO.';

            $details = [];
            if ($wasPaid) {
                $details[] = 'Monto: $' . number_format($paidAmount, 2, ',', '.');
                if (!empty($paymentMethodName)) {
                    $details[] = 'Método: ' . $paymentMethodName;
                }
                if (!empty($paidAt)) {
                    $details[] = 'Fecha cobro: ' . $paidAt->format('d/m/Y H:i');
                }
            }

            $repair->notes()->create([
                'user_id' => auth()->id(),
                'note' => trim('Reparación cancelada. ' . $paidStatusMessage . ' ' . implode(' | ', $details)),
            ]);
        }

        return $repair;
    }

    public function markNoRepair(int $id, ?string $reason): Repair
    {
        $repair = Repair::findOrFail($id);
        $repair->update([
            'is_no_repair' => true,
            'no_repair_reason' => $reason,
            'no_repair_at' => now(),
        ]);

        return $repair;
    }

    public function assignTechnician(int $id, int $technicianId): Repair
    {
        $repair = Repair::findOrFail($id);
        $repair->update(['technician_id' => $technicianId]);
        return $repair;
    }

    public function addNote(int $id, int $userId, string $note): void
    {
        RepairNote::create([
            'repair_id' => $id,
            'user_id' => $userId,
            'note' => $note,
        ]);
    }

    public function stats(array $filters = []): array
    {
        $base = Repair::query();
        if (!empty($filters['branch_id']) || !empty($filters['branch_ids'])) {
            $branchIds = $filters['branch_ids'] ?? $filters['branch_id'];
            if (is_string($branchIds)) {
                $branchIds = array_filter(array_map('trim', explode(',', $branchIds)));
            }
            if (is_array($branchIds)) {
                $base->whereIn('branch_id', $branchIds);
            } else {
                $base->where('branch_id', $branchIds);
            }
        }

        // Apply date range to stats using intake_date only
        if (!empty($filters['from_date'])) {
            $base->whereDate('intake_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $base->whereDate('intake_date', '<=', $filters['to_date']);
        }

        $total = (clone $base)->count();
        $enProceso = (clone $base)->whereIn('status', ['En diagnóstico', 'Reparación Interna', 'Reparación Externa', 'Esperando repuestos'])->count();
        $terminadas = (clone $base)->where('status', 'Terminado')->count();
        $entregadas = (clone $base)->where('status', 'Entregado')->count();

        return compact('total', 'enProceso', 'terminadas', 'entregadas');
    }

    public function deriveToExternal(int $id, array $data): Repair
    {
        return DB::transaction(function () use ($id, $data) {
            $repair = Repair::whereKey($id)
                ->lockForUpdate()
                ->with(['customer.person', 'subcontractedService'])
                ->firstOrFail();

            if ($repair->subcontractedService !== null) {
                throw new \Exception('La reparación ya tiene una derivación externa asociada.');
            }

            $supplierId = (int) ($data['supplier_id'] ?? 0);
            $agreedCost = round((float) ($data['agreed_cost'] ?? 0), 2);
            if ($supplierId <= 0 || $agreedCost <= 0) {
                throw new \Exception('Proveedor y costo acordado son obligatorios para derivar la reparación.');
            }

            $supplier = \App\Models\Supplier::findOrFail($supplierId);

            $supplierAccount = CurrentAccount::firstOrCreate(
                ['supplier_id' => $supplier->id],
                [
                    'credit_limit' => null,
                    'current_balance' => 0,
                    'status' => 'active',
                    'opened_at' => now(),
                ]
            );

            $subcontractedServicePayload = [
                'repair_id' => $repair->id,
                'supplier_id' => $supplier->id,
                'current_account_id' => $supplierAccount->id,
                'description' => $data['description'] ?? sprintf('Derivación externa reparación %s', $repair->code),
                'notes' => $data['notes'] ?? null,
                'agreed_cost' => $agreedCost,
                'paid_amount' => 0,
                'payment_status' => 'pending',
            ];

            // Compatibilidad con esquemas legados donde estas columnas siguen siendo obligatorias.
            if (Schema::hasColumn('subcontracted_services', 'customer_id')) {
                if (empty($repair->customer_id)) {
                    throw new \Exception('La reparación debe tener cliente asociado para registrar servicio externo.');
                }
                $subcontractedServicePayload['customer_id'] = (int) $repair->customer_id;
            }

            if (Schema::hasColumn('subcontracted_services', 'provider_id')) {
                $subcontractedServicePayload['provider_id'] = $supplier->id;
            }

            if (Schema::hasColumn('subcontracted_services', 'title')) {
                $subcontractedServicePayload['title'] = $data['description'] ?? sprintf('Servicio externo %s', $repair->code);
            }

            if (Schema::hasColumn('subcontracted_services', 'branch_id')) {
                $subcontractedServicePayload['branch_id'] = $repair->branch_id;
            }

            if (Schema::hasColumn('subcontracted_services', 'provider_cost')) {
                $subcontractedServicePayload['provider_cost'] = $agreedCost;
            }

            if (Schema::hasColumn('subcontracted_services', 'customer_price')) {
                $subcontractedServicePayload['customer_price'] = (float) ($repair->sale_price_with_iva ?? $repair->sale_price ?? 0);
            }

            if (Schema::hasColumn('subcontracted_services', 'is_provider_paid')) {
                $subcontractedServicePayload['is_provider_paid'] = false;
            }

            if (Schema::hasColumn('subcontracted_services', 'is_customer_charged')) {
                $subcontractedServicePayload['is_customer_charged'] = false;
            }

            $subcontractedService = SubcontractedService::create($subcontractedServicePayload);

            $movementType = MovementType::firstOrCreate(
                ['name' => 'Costo reparación externa', 'operation_type' => 'salida'],
                [
                    'description' => 'Débito por costo de reparación derivada a proveedor externo',
                    'is_cash_movement' => false,
                    'is_current_account_movement' => true,
                    'active' => true,
                ]
            );

            /** @var CurrentAccountService $currentAccountService */
            $currentAccountService = app(CurrentAccountService::class);
            $movement = $currentAccountService->createMovement([
                'current_account_id' => $supplierAccount->id,
                'movement_type_id' => $movementType->id,
                'amount' => $agreedCost,
                'description' => sprintf('Costo reparación externa %s - %s', $repair->code, $supplier->name),
                'reference' => $repair->code,
                'metadata' => [
                    'kind' => 'repair_external_service_charge',
                    'repair_id' => $repair->id,
                    'repair_code' => $repair->code,
                    'supplier_id' => $supplier->id,
                    'subcontracted_service_id' => $subcontractedService->id,
                    'agreed_cost' => $agreedCost,
                ],
            ]);

            $movementReferences = [
                'charge_movement_id' => $movement->id,
            ];

            if (Schema::hasColumn('subcontracted_services', 'provider_account_entry_id')) {
                $movementReferences['provider_account_entry_id'] = $movement->id;
            }

            $subcontractedService->update($movementReferences);

            if ($repair->status !== 'Reparación Externa') {
                $repair->update(['status' => 'Reparación Externa']);
            }

            $repair->notes()->create([
                'user_id' => auth()->id(),
                'note' => sprintf(
                    'Derivada a proveedor externo %s por $%s.',
                    $supplier->name,
                    number_format($agreedCost, 2, ',', '.')
                ),
            ]);

            return $this->find($repair->id) ?? $repair;
        });
    }

    public function payExternalService(int $id, array $data): Repair
    {
        return DB::transaction(function () use ($id, $data) {
            $repair = Repair::whereKey($id)
                ->lockForUpdate()
                ->with(['subcontractedService'])
                ->firstOrFail();

            $subcontractedService = SubcontractedService::where('repair_id', $repair->id)
                ->lockForUpdate()
                ->first();

            if (!$subcontractedService) {
                throw new \Exception('La reparación no tiene derivación externa para registrar pagos.');
            }

            $amount = round((float) ($data['amount'] ?? 0), 2);
            $paymentMethodId = (int) ($data['payment_method_id'] ?? 0);
            if ($amount <= 0 || $paymentMethodId <= 0) {
                throw new \Exception('Monto y método de pago son obligatorios.');
            }

            $pendingAmount = (float) $subcontractedService->pending_amount;
            if ($pendingAmount <= self::PAYMENT_TOLERANCE) {
                throw new \Exception('La derivación externa ya está completamente pagada.');
            }

            if (($amount - $pendingAmount) > self::PAYMENT_TOLERANCE) {
                throw new \Exception('El pago supera el saldo pendiente de la derivación externa.');
            }

            $cashRegisterId = isset($data['cash_register_id'])
                ? (int) $data['cash_register_id']
                : 0;

            if ($cashRegisterId <= 0) {
                $cashRegisterId = (int) (CashRegister::query()
                    ->where('branch_id', $repair->branch_id)
                    ->where('status', 'open')
                    ->latest('id')
                    ->value('id') ?? 0);
            }

            if ($cashRegisterId <= 0) {
                throw new \Exception('Debe seleccionar una caja abierta para registrar el pago al proveedor externo.');
            }

            $supplierName = $subcontractedService->supplier?->name ?? 'Proveedor';

            /** @var CurrentAccountService $currentAccountService */
            $currentAccountService = app(CurrentAccountService::class);
            $movement = $currentAccountService->processSupplierPayment(
                (int) $subcontractedService->current_account_id,
                [
                    'amount' => $amount,
                    'payment_method_id' => $paymentMethodId,
                    'cash_register_id' => $cashRegisterId,
                    'description' => sprintf('Pago reparación externa %s - %s', $repair->code, $supplierName),
                    'notes' => $data['notes'] ?? null,
                    'metadata' => [
                        'kind' => 'repair_external_service_payment',
                        'repair_id' => $repair->id,
                        'repair_code' => $repair->code,
                        'supplier_id' => $subcontractedService->supplier_id,
                        'subcontracted_service_id' => $subcontractedService->id,
                    ],
                ]
            );

            $movementMetadata = (array) ($movement->metadata ?? []);
            $cashMovementId = isset($movementMetadata['cash_movement_id'])
                ? (int) $movementMetadata['cash_movement_id']
                : null;

            $expenseCategoryId = $this->resolveExternalSupplierExpenseCategoryId();
            if ($expenseCategoryId === null) {
                throw new \Exception('No hay una categoría de gastos activa para registrar pagos a proveedores externos.');
            }

            Expense::create([
                'branch_id' => (int) $repair->branch_id,
                'category_id' => $expenseCategoryId,
                'user_id' => auth()->id(),
                'payment_method_id' => $paymentMethodId,
                'cash_movement_id' => $cashMovementId,
                'description' => sprintf('Pago proveedor externo reparación %s - %s', $repair->code, $supplierName),
                'amount' => $amount,
                'date' => now()->toDateString(),
                'status' => 'paid',
                'affects_cash_balance' => true,
                'is_recurring' => false,
            ]);

            SubcontractedServicePayment::create([
                'subcontracted_service_id' => $subcontractedService->id,
                'current_account_movement_id' => $movement->id,
                'payment_method_id' => $paymentMethodId,
                'amount' => $amount,
                'notes' => $data['notes'] ?? null,
                'paid_at' => now(),
                'user_id' => auth()->id(),
            ]);

            $newPaidAmount = round((float) $subcontractedService->paid_amount + $amount, 2);
            $remaining = max(0, round((float) $subcontractedService->agreed_cost - $newPaidAmount, 2));

            $subcontractedService->update([
                'paid_amount' => $newPaidAmount,
                'payment_status' => $remaining <= self::PAYMENT_TOLERANCE ? 'paid' : 'partial',
                'fully_paid_at' => $remaining <= self::PAYMENT_TOLERANCE ? now() : null,
            ]);

            $repair->notes()->create([
                'user_id' => auth()->id(),
                'note' => sprintf(
                    'Pago a proveedor externo %s por $%s (pendiente: $%s).',
                    $supplierName,
                    number_format($amount, 2, ',', '.'),
                    number_format($remaining, 2, ',', '.')
                ),
            ]);

            return $this->find($repair->id) ?? $repair;
        });
    }

    private function resolveExternalSupplierExpenseCategoryId(): ?int
    {
        $categories = ExpenseCategory::query()
            ->where('active', true)
            ->get(['id', 'name']);

        if ($categories->isEmpty()) {
            $created = ExpenseCategory::create([
                'name' => 'Otros Gastos',
                'description' => 'Categoría creada automáticamente para pagos a proveedores externos de reparaciones',
                'active' => true,
            ]);

            return (int) $created->id;
        }

        $preferredNames = [
            'Mantenimiento y Reparaciones',
            'Servicios',
            'Otros Gastos',
        ];

        foreach ($preferredNames as $name) {
            $match = $categories->first(function (ExpenseCategory $category) use ($name) {
                return mb_strtolower((string) $category->name) === mb_strtolower($name);
            });

            if ($match) {
                return (int) $match->id;
            }
        }

        return (int) $categories->first()->id;
    }

    public function getExternalServicesBySupplier(int $supplierId, array $filters = []): Collection
    {
        $query = SubcontractedService::query()
            ->with([
                'repair.customer.person',
                'supplier',
                'payments.paymentMethod',
            ])
            ->where('supplier_id', $supplierId)
            ->orderByDesc('id');

        if (!empty($filters['payment_status'])) {
            $query->where('payment_status', $filters['payment_status']);
        }

        if (!empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }

        if (!empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        return $query->get();
    }

    /**
     * Mark a repair as paid and register cash movement (unless sale price is zero / sin cargo).
     *
     * @param int $id Repair ID
     * @param array $data Payment data containing payment_method_id, amount_paid, branch_id
     * @return Repair Updated repair with payment info
     * @throws \Exception When no open cash register or validation fails
     */
    public function markAsPaid(int $id, array $data): Repair
    {
        return DB::transaction(function () use ($id, $data) {
            $repair = Repair::whereKey($id)->lockForUpdate()->firstOrFail();

            if (empty($repair->customer_id)) {
                throw new \Exception('La reparación debe tener un cliente asociado para registrar cobros.');
            }

            $salePriceWithIva = (float) ($repair->sale_price_with_iva ?? $repair->sale_price ?? 0);
            $salePriceWithoutIva = (float) ($repair->sale_price_without_iva ?? 0);
            if ($salePriceWithIva <= 0.01 && $salePriceWithoutIva <= 0.01) {
                return $this->markAsPaidWithoutCash($repair, $data);
            }

            $chargeWithIva = array_key_exists('charge_with_iva', $data)
                ? (bool) $data['charge_with_iva']
                : (bool) ($repair->charge_with_iva ?? true);

            if (
                (float) ($repair->total_paid ?? 0) > self::PAYMENT_TOLERANCE
                && array_key_exists('charge_with_iva', $data)
                && (bool) $repair->charge_with_iva !== $chargeWithIva
            ) {
                throw new \Exception('No se puede cambiar la modalidad de cobro cuando ya existen pagos parciales registrados.');
            }

            $expectedAmount = $this->resolveExpectedAmount($repair, $chargeWithIva);

            $activePaid = (float) $repair->payments()
                ->where('is_reversed', false)
                ->sum('amount');
            $pendingAmount = round(max(0, $expectedAmount - $activePaid), 2);

            if ($pendingAmount <= self::PAYMENT_TOLERANCE) {
                throw new \Exception('La reparación ya no tiene saldo pendiente.');
            }

            $payments = $this->normalizePaymentEntries($data, $pendingAmount);
            $paymentMethodIds = collect($payments)
                ->pluck('payment_method_id')
                ->unique()
                ->values();

            $paymentMethods = PaymentMethod::whereIn('id', $paymentMethodIds)->get()->keyBy('id');

            if ($paymentMethods->count() !== $paymentMethodIds->count()) {
                throw new \Exception('Uno o más métodos de pago no son válidos.');
            }

            $this->assertAllowedRepairPaymentMethods($paymentMethods);

            $requiresCashRegister = collect($payments)->contains(function (array $payment) use ($paymentMethods) {
                $method = $paymentMethods->get($payment['payment_method_id']);
                return $this->paymentMethodAffectsCash($method);
            });

            $cashRegister = null;
            $cashMovementType = null;
            $selectedBranchId = isset($data['branch_id']) ? (int) $data['branch_id'] : null;

            if ($requiresCashRegister) {
                if (empty($selectedBranchId)) {
                    throw new \Exception('Se requiere una sucursal con caja abierta para registrar métodos que impactan en caja.');
                }

                $cashRegister = CashRegister::where('branch_id', $selectedBranchId)
                    ->where('status', 'open')
                    ->latest()
                    ->first();

                if (!$cashRegister) {
                    throw new \Exception('No se encontró una caja abierta en la sucursal seleccionada');
                }

                $cashMovementType = MovementType::firstOrCreate(
                    ['name' => 'Pago de reparación', 'operation_type' => 'entrada'],
                    [
                        'description' => 'Ingreso por pago de servicio de reparación',
                        'is_cash_movement' => true,
                        'is_current_account_movement' => false,
                        'active' => true,
                    ]
                );
            }

            $currentAccount = CurrentAccount::firstOrCreate(
                ['customer_id' => $repair->customer_id],
                [
                    'credit_limit' => null,
                    'current_balance' => 0,
                    'status' => 'active',
                    'opened_at' => now(),
                ]
            );

            $this->ensureRepairDebtRegistered($repair, $currentAccount, $expectedAmount, $chargeWithIva);

            $customerName = $repair->customer->person->full_name ?? 'Cliente';

            foreach ($payments as $payment) {
                $paymentMethod = $paymentMethods->get($payment['payment_method_id']);
                $cashMovementId = null;

                if ($cashRegister && $this->paymentMethodAffectsCash($paymentMethod)) {
                    $cashMovement = CashMovement::create([
                        'cash_register_id' => $cashRegister->id,
                        'movement_type_id' => $cashMovementType?->id,
                        'payment_method_id' => $paymentMethod->id,
                        'amount' => $payment['amount'],
                        'description' => sprintf(
                            'Pago reparación #%s - %s | Método: %s (%s)',
                            $repair->code,
                            $customerName,
                            $paymentMethod->name,
                            $chargeWithIva ? 'con IVA' : 'sin IVA'
                        ),
                        'user_id' => auth()->id(),
                        'reference_type' => 'repair',
                        'reference_id' => $repair->id,
                    ]);

                    $cashMovementId = $cashMovement->id;
                }

                $repairPayment = RepairPayment::create([
                    'repair_id' => $repair->id,
                    'payment_method_id' => $paymentMethod?->id,
                    'cash_movement_id' => $cashMovementId,
                    'amount' => $payment['amount'],
                    'charge_with_iva' => $chargeWithIva,
                    'paid_at' => now(),
                    'user_id' => auth()->id(),
                ]);

                $this->registerCurrentAccountPayment(
                    $currentAccount,
                    $repair,
                    $repairPayment,
                    $paymentMethod,
                    $payment['amount'],
                    $selectedBranchId
                );
            }

            $this->syncRepairPaymentSnapshot($repair, $expectedAmount, $chargeWithIva);

            $paymentsSummary = collect($payments)
                ->map(function (array $payment) use ($paymentMethods) {
                    $methodName = $paymentMethods->get($payment['payment_method_id'])?->name ?? 'Método desconocido';
                    return sprintf('%s: $%s', $methodName, number_format((float) $payment['amount'], 2, ',', '.'));
                })
                ->implode(' | ');

            $repair->notes()->create([
                'user_id' => auth()->id(),
                'note' => sprintf(
                    'Cobro registrado (%s). Detalle: %s',
                    $chargeWithIva ? 'con IVA' : 'sin IVA',
                    $paymentsSummary
                ),
            ]);

            if ($cashRegister) {
                $cashRegister->updateCalculatedFields();
            }

            return $repair->fresh()->load(['paymentMethod', 'cashMovement', 'payments.paymentMethod']);
        });
    }

    /**
     * Revert latest non-reversed repair payment.
     */
    public function markAsUnpaid(int $id, ?int $paymentId = null): Repair
    {
        return DB::transaction(function () use ($id, $paymentId) {
            $repair = Repair::whereKey($id)->lockForUpdate()->firstOrFail();

            $paymentQuery = $repair->payments()
                ->where('is_reversed', false)
                ->with(['paymentMethod', 'cashMovement.cashRegister']);

            if ($paymentId !== null) {
                $latestPayment = $paymentQuery
                    ->where('id', $paymentId)
                    ->first();
            } else {
                $latestPayment = $paymentQuery
                    ->latest('id')
                    ->first();
            }

            if (!$latestPayment) {
                throw new \Exception($paymentId !== null
                    ? 'No se encontró el pago seleccionado para esta reparación.'
                    : 'La reparación no tiene un cobro registrado'
                );
            }

            $previousAmount = (float) ($latestPayment->amount ?? 0);
            $previousPaymentMethod = $latestPayment->paymentMethod?->name ?? 'No especificado';
            $previousChargeMode = $latestPayment->charge_with_iva === false ? 'sin IVA' : 'con IVA';

            $cashMovement = $latestPayment->cashMovement;
            if ($cashMovement) {
                if (!$cashMovement->affects_balance) {
                    throw new \Exception('El cobro ya fue revertido previamente');
                }

                if (!$cashMovement->cashRegister || !$cashMovement->cashRegister->isOpen()) {
                    throw new \Exception('No se puede revertir el cobro porque la caja asociada está cerrada');
                }

                $revertFlag = '[REVERTIDO COBRO REPARACION]';
                $description = (string) ($cashMovement->description ?? '');
                if (!Str::contains($description, $revertFlag)) {
                    $description = trim($description . ' ' . $revertFlag);
                }

                $cashMovement->update([
                    'affects_balance' => false,
                    'description' => $description,
                ]);

                $cashMovement->cashRegister->updateCalculatedFields();
            }

            $this->registerCurrentAccountPaymentReversal($repair, $latestPayment, $previousPaymentMethod);

            $latestPayment->update([
                'is_reversed' => true,
                'reversed_at' => now(),
            ]);

            $expectedAmount = $this->resolveExpectedAmount($repair, (bool) ($repair->charge_with_iva ?? true));
            $this->syncRepairPaymentSnapshot($repair, $expectedAmount, (bool) ($repair->charge_with_iva ?? true));

            $repair->notes()->create([
                'user_id' => auth()->id(),
                'note' => sprintf(
                    'Cobro revertido. Monto revertido: $%s | Modalidad previa: %s | Método previo: %s',
                    number_format($previousAmount, 2, ',', '.'),
                    $previousChargeMode,
                    $previousPaymentMethod
                ),
            ]);

            return $repair->fresh()->load(['paymentMethod', 'cashMovement', 'payments.paymentMethod']);
        });
    }

    /**
     * Sin ingreso: precio de venta ~0. No movimiento de caja.
     */
    private function markAsPaidWithoutCash(Repair $repair, array $data): Repair
    {
        $paymentMethodId = isset($data['payment_method_id']) ? (int) $data['payment_method_id'] : null;
        if (!$paymentMethodId) {
            $sinCargo = PaymentMethod::where('name', 'Sin cargo')->first();
            if (!$sinCargo) {
                throw new \Exception('No está configurado el método de pago "Sin cargo". Ejecute los seeders o créelo en el sistema.');
            }
            $paymentMethodId = $sinCargo->id;
        }

        $repair->update([
            'is_paid' => true,
            'payment_status' => 'paid',
            'amount_paid' => 0,
            'total_paid' => 0,
            'payment_method_id' => $paymentMethodId,
            'paid_at' => now(),
            'cash_movement_id' => null,
            'charge_with_iva' => array_key_exists('charge_with_iva', $data) ? (bool) $data['charge_with_iva'] : true,
        ]);

        $repair->notes()->create([
            'user_id' => auth()->id(),
            'note' => 'Cobro registrado sin impacto en caja (sin cargo).',
        ]);

        return $repair->load(['paymentMethod', 'cashMovement', 'payments.paymentMethod']);
    }

    private function normalizePaymentEntries(array $data, float $pendingAmount): array
    {
        $payments = [];

        if (isset($data['payments']) && is_array($data['payments']) && count($data['payments']) > 0) {
            foreach ($data['payments'] as $index => $payment) {
                $paymentMethodId = (int) ($payment['payment_method_id'] ?? 0);
                $amount = round((float) ($payment['amount'] ?? 0), 2);

                if ($paymentMethodId <= 0) {
                    throw new \Exception("El método de pago de la fila {$index} es obligatorio.");
                }

                if ($amount <= 0) {
                    throw new \Exception("El monto de la fila {$index} debe ser mayor a 0.");
                }

                $payments[] = [
                    'payment_method_id' => $paymentMethodId,
                    'amount' => $amount,
                ];
            }
        } else {
            $paymentMethodId = (int) ($data['payment_method_id'] ?? 0);
            if ($paymentMethodId <= 0) {
                throw new \Exception('Se requiere al menos un método de pago válido.');
            }

            $amount = isset($data['amount_paid'])
                ? round((float) $data['amount_paid'], 2)
                : round($pendingAmount, 2);

            if ($amount <= 0) {
                throw new \Exception('El monto a cobrar debe ser mayor a 0.');
            }

            $payments[] = [
                'payment_method_id' => $paymentMethodId,
                'amount' => $amount,
            ];
        }

        $totalIncoming = round((float) collect($payments)->sum('amount'), 2);
        if ($totalIncoming > ($pendingAmount + self::PAYMENT_TOLERANCE)) {
            throw new \Exception(sprintf(
                'El monto ingresado ($%s) supera el saldo pendiente ($%s).',
                number_format($totalIncoming, 2, ',', '.'),
                number_format($pendingAmount, 2, ',', '.')
            ));
        }

        return $payments;
    }

    private function assertAllowedRepairPaymentMethods(Collection $paymentMethods): void
    {
        $creditMethod = $paymentMethods->first(function (PaymentMethod $method) {
            return $method->isSaleOnCustomerCredit();
        });

        if ($creditMethod) {
            throw new \Exception('Cuenta Corriente no se puede usar como método de cobro en reparaciones.');
        }
    }

    private function paymentMethodAffectsCash(?PaymentMethod $paymentMethod): bool
    {
        if (!$paymentMethod) {
            return false;
        }

        // Regla de reparaciones: todos los métodos de cobro reales impactan en caja,
        // excepto Cuenta Corriente, que está prohibido como método de cobro.
        return !$paymentMethod->isSaleOnCustomerCredit();
    }

    private function resolveExpectedAmount(Repair $repair, bool $chargeWithIva): float
    {
        return $chargeWithIva
            ? (float) ($repair->sale_price_with_iva ?? $repair->sale_price ?? 0)
            : (float) ($repair->sale_price_without_iva ?? 0);
    }

    private function syncRepairPaymentSnapshot(Repair $repair, float $expectedAmount, bool $chargeWithIva): void
    {
        $activePayments = $repair->payments()
            ->where('is_reversed', false)
            ->with('paymentMethod')
            ->get();

        $totalPaid = round((float) $activePayments->sum('amount'), 2);
        $pending = round(max(0, $expectedAmount - $totalPaid), 2);

        $status = 'pending';
        if ($pending <= self::PAYMENT_TOLERANCE) {
            $status = 'paid';
        } elseif ($totalPaid > self::PAYMENT_TOLERANCE) {
            $status = 'partial';
        }

        $latestActivePayment = $activePayments->sortByDesc('id')->first();

        $repair->update([
            'is_paid' => $status === 'paid',
            'payment_status' => $status,
            'amount_paid' => $totalPaid > self::PAYMENT_TOLERANCE ? $totalPaid : null,
            'total_paid' => $totalPaid,
            'payment_method_id' => $latestActivePayment?->payment_method_id,
            'paid_at' => $latestActivePayment?->paid_at,
            'cash_movement_id' => $latestActivePayment?->cash_movement_id,
            'charge_with_iva' => $chargeWithIva,
        ]);
    }

    private function ensureRepairDebtRegistered(Repair $repair, CurrentAccount $currentAccount, float $expectedAmount, bool $chargeWithIva): void
    {
        $movementType = MovementType::firstOrCreate(
            ['name' => 'Venta', 'operation_type' => 'salida'],
            [
                'description' => 'Débito por operación de venta o servicio en cuenta corriente',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ]
        );

        $alreadyRegistered = $currentAccount->movements()
            ->where('movement_type_id', $movementType->id)
            ->where('metadata->kind', 'repair_charge')
            ->where('metadata->repair_id', $repair->id)
            ->exists();

        if ($alreadyRegistered) {
            return;
        }

        /** @var CurrentAccountService $currentAccountService */
        $currentAccountService = app(CurrentAccountService::class);
        $currentAccountService->createMovement([
            'current_account_id' => $currentAccount->id,
            'movement_type_id' => $movementType->id,
            'amount' => $expectedAmount,
            'description' => sprintf('Reparación %s', $repair->code),
            'reference' => $repair->code,
            'metadata' => [
                'kind' => 'repair_charge',
                'repair_id' => $repair->id,
                'repair_code' => $repair->code,
                'charge_mode' => $chargeWithIva ? 'with_iva' : 'without_iva',
            ],
        ]);
    }

    private function registerCurrentAccountPayment(
        CurrentAccount $currentAccount,
        Repair $repair,
        RepairPayment $repairPayment,
        ?PaymentMethod $paymentMethod,
        float $amount,
        ?int $selectedBranchId
    ): void {
        $paymentTypeName = match ($paymentMethod?->name) {
            'Tarjeta de crédito', 'Tarjeta de débito' => 'Pago con tarjeta',
            'Transferencia' => 'Pago con transferencia',
            default => 'Pago en efectivo',
        };

        $paymentMovementType = MovementType::firstOrCreate(
            ['name' => $paymentTypeName, 'operation_type' => 'entrada'],
            [
                'description' => 'Ingreso por cancelación de saldo en cuenta corriente',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ]
        );

        $branch = $selectedBranchId ? Branch::find($selectedBranchId) : null;

        /** @var CurrentAccountService $currentAccountService */
        $currentAccountService = app(CurrentAccountService::class);
        $currentAccountService->createMovement([
            'current_account_id' => $currentAccount->id,
            'movement_type_id' => $paymentMovementType->id,
            'amount' => $amount,
            'description' => sprintf('Pago de reparación %s - %s', $repair->code, $paymentMethod?->name ?? 'Método desconocido'),
            'reference' => $repair->code,
            'metadata' => [
                'kind' => 'repair_payment',
                'repair_id' => $repair->id,
                'repair_code' => $repair->code,
                'repair_payment_id' => $repairPayment->id,
                'payment_method_id' => $repairPayment->payment_method_id,
                'payment_method_name' => $paymentMethod?->name,
                'payment_amount' => $amount,
                'payment_branch_id' => $selectedBranchId,
                'payment_branch_description' => $branch?->description,
                'payment_branch_color' => $branch?->color,
            ],
            'payment_method_id' => $repairPayment->payment_method_id,
        ]);
    }

    private function registerCurrentAccountPaymentReversal(Repair $repair, RepairPayment $repairPayment, string $paymentMethodName): void
    {
        if (empty($repair->customer_id)) {
            return;
        }

        $currentAccount = CurrentAccount::where('customer_id', $repair->customer_id)->first();
        if (!$currentAccount) {
            return;
        }

        $movementType = MovementType::firstOrCreate(
            ['name' => 'Venta', 'operation_type' => 'salida'],
            [
                'description' => 'Débito por operación de venta o servicio en cuenta corriente',
                'is_cash_movement' => false,
                'is_current_account_movement' => true,
                'active' => true,
            ]
        );

        /** @var CurrentAccountService $currentAccountService */
        $currentAccountService = app(CurrentAccountService::class);
        $currentAccountService->createMovement([
            'current_account_id' => $currentAccount->id,
            'movement_type_id' => $movementType->id,
            'amount' => (float) $repairPayment->amount,
            'description' => sprintf('Reversión de pago reparación %s - %s', $repair->code, $paymentMethodName),
            'reference' => $repair->code,
            'metadata' => [
                'kind' => 'repair_payment_reversal',
                'repair_id' => $repair->id,
                'repair_code' => $repair->code,
                'repair_payment_id' => $repairPayment->id,
                'payment_method_name' => $paymentMethodName,
            ],
        ]);
    }

    private function normalizeRepairPricing(array $data, ?Repair $repair = null): array
    {
        $hasNetInput = array_key_exists('sale_price_without_iva', $data);
        $hasIvaInput = array_key_exists('iva_percentage', $data);
        $hasGrossInput = array_key_exists('sale_price_with_iva', $data);
        $hasLegacyGrossInput = array_key_exists('sale_price', $data);

        if (!$hasNetInput && !$hasIvaInput && !$hasGrossInput && !$hasLegacyGrossInput) {
            if (!$repair && !array_key_exists('iva_percentage', $data)) {
                $data['iva_percentage'] = self::DEFAULT_IVA_PERCENTAGE;
            }
            if (!$repair && !array_key_exists('charge_with_iva', $data)) {
                $data['charge_with_iva'] = true;
            }
            return $data;
        }

        $currentNet = $repair?->sale_price_without_iva !== null ? (float) $repair->sale_price_without_iva : null;
        $currentGross = $repair?->sale_price_with_iva !== null
            ? (float) $repair->sale_price_with_iva
            : ($repair?->sale_price !== null ? (float) $repair->sale_price : null);
        $currentIva = $repair?->iva_percentage !== null ? (float) $repair->iva_percentage : self::DEFAULT_IVA_PERCENTAGE;

        $ivaPercentage = $this->normalizeNullableFloat($data['iva_percentage'] ?? $currentIva) ?? self::DEFAULT_IVA_PERCENTAGE;
        $netAmount = $hasNetInput
            ? $this->normalizeNullableFloat($data['sale_price_without_iva'])
            : null;
        $grossAmount = $hasGrossInput
            ? $this->normalizeNullableFloat($data['sale_price_with_iva'])
            : ($hasLegacyGrossInput ? $this->normalizeNullableFloat($data['sale_price']) : null);

        if ($hasNetInput && !$hasGrossInput) {
            $grossAmount = $netAmount !== null
                ? $this->calculateGrossFromNet($netAmount, $ivaPercentage)
                : null;
        }

        if ($repair && $hasIvaInput && !$hasNetInput && !$hasGrossInput && !$hasLegacyGrossInput) {
            $netAmount = $currentNet;
            if ($netAmount === null && $currentGross !== null) {
                $netAmount = $this->calculateNetFromGross($currentGross, $currentIva);
            }
            $grossAmount = $netAmount !== null ? $this->calculateGrossFromNet($netAmount, $ivaPercentage) : null;
        }

        if ($netAmount === null && $grossAmount === null && $repair) {
            $netAmount = $currentNet;
            $grossAmount = $currentGross;
        }

        if ($netAmount === null && $grossAmount !== null) {
            $netAmount = $this->calculateNetFromGross($grossAmount, $ivaPercentage);
        }

        if ($grossAmount === null && $netAmount !== null) {
            $grossAmount = $this->calculateGrossFromNet($netAmount, $ivaPercentage);
        }

        $data['sale_price_without_iva'] = $netAmount !== null ? $this->roundCurrency($netAmount) : null;
        $data['sale_price_with_iva'] = $grossAmount !== null ? $this->roundCurrency($grossAmount) : null;
        $data['sale_price'] = $data['sale_price_with_iva'];
        $data['iva_percentage'] = $this->roundPercentage($ivaPercentage);

        if (!$repair && !array_key_exists('charge_with_iva', $data)) {
            $data['charge_with_iva'] = true;
        }

        return $data;
    }

    private function normalizeNullableFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }

    private function calculateGrossFromNet(float $net, float $ivaPercentage): float
    {
        return $this->roundCurrency($net * (1 + ($ivaPercentage / 100)));
    }

    private function calculateNetFromGross(float $gross, float $ivaPercentage): float
    {
        $divisor = 1 + ($ivaPercentage / 100);
        if ($divisor <= 0) {
            return $this->roundCurrency($gross);
        }

        return $this->roundCurrency($gross / $divisor);
    }

    private function roundCurrency(float $value): float
    {
        return round($value, 2);
    }

    private function roundPercentage(float $value): float
    {
        return round($value, 2);
    }

    private function generateCode(): string
    {
        $nextId = (Repair::max('id') ?? 0) + 1;
        return 'REP' . str_pad((string) $nextId, 3, '0', STR_PAD_LEFT);
    }
}
