<?php

namespace App\Services;

use App\Interfaces\RepairServiceInterface;
use App\Models\Repair;
use App\Models\RepairNote;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RepairService implements RepairServiceInterface
{
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
            ->with(['customer.person', 'branch', 'category', 'technician.person', 'sale', 'insurer', 'insuredCustomer.person'])
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
        return Repair::with(['customer.person', 'branch', 'category', 'technician.person', 'notes.user.person', 'sale', 'insurer', 'insuredCustomer.person', 'paymentMethod', 'cashMovement'])->find($id);
    }


    public function create(array $data): Repair
    {
        return DB::transaction(function () use ($data) {
            $data['code'] = $data['code'] ?? $this->generateCode();
            $data['status'] = $data['status'] ?? 'Pendiente de recepción';
            $data['intake_date'] = $data['intake_date'] ?? now()->toDateString();

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
        $repair->update($data);
        return $repair;
    }

    public function updateStatus(int $id, string $status): Repair
    {
        $repair = Repair::findOrFail($id);
        $repair->update(['status' => $status]);
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

    /**
     * Mark a repair as paid and register cash movement
     * 
     * @param int $id Repair ID
     * @param array $data Payment data containing payment_method_id, amount_paid, branch_id
     * @return Repair Updated repair with payment info
     * @throws \Exception When no open cash register or validation fails
     */
    public function markAsPaid(int $id, array $data): Repair
    {
        return DB::transaction(function () use ($id, $data) {
            $repair = Repair::findOrFail($id);

            // Validate repair is not already paid
            if ($repair->is_paid) {
                throw new \Exception('Esta reparación ya fue marcada como cobrada');
            }

            // Validate required fields
            if (empty($data['payment_method_id']) || empty($data['branch_id'])) {
                throw new \Exception('Se requieren el método de pago y la sucursal');
            }

            $amount = (float)($data['amount_paid'] ?? $repair->sale_price ?? 0);
            if ($amount <= 0) {
                throw new \Exception('El monto a cobrar debe ser mayor a 0');
            }

            // Find open cash register for the branch
            $cashRegister = \App\Models\CashRegister::where('branch_id', $data['branch_id'])
                ->where('status', 'open')
                ->latest()
                ->first();

            if (!$cashRegister) {
                throw new \Exception('No se encontró una caja abierta en la sucursal seleccionada');
            }

            // Find or create movement type for repair payment
            $movementType = \App\Models\MovementType::firstOrCreate(
                ['name' => 'Pago de reparación'],
                [
                    'description' => 'Ingreso por pago de servicio de reparación',
                    'operation_type' => 'entrada',
                    'is_cash_movement' => true,
                    'is_current_account_movement' => false,
                    'active' => true,
                ]
            );

            // Create cash movement
            $customerName = $repair->customer->person->full_name ?? 'Cliente';
            $cashMovement = \App\Models\CashMovement::create([
                'cash_register_id' => $cashRegister->id,
                'movement_type_id' => $movementType->id,
                'payment_method_id' => $data['payment_method_id'],
                'amount' => $amount,
                'description' => "Pago reparación #{$repair->code} - {$customerName}",
                'user_id' => auth()->id(),
                'reference_type' => 'repair',
                'reference_id' => $repair->id,
            ]);

            // Update repair with payment info
            $repair->update([
                'is_paid' => true,
                'amount_paid' => $amount,
                'sale_price' => $amount,
                'payment_method_id' => $data['payment_method_id'],
                'paid_at' => now(),
                'cash_movement_id' => $cashMovement->id,
            ]);

            // Update cash register calculated fields
            $cashRegister->updateCalculatedFields();

            // Load relationships for response
            return $repair->load(['paymentMethod', 'cashMovement']);
        });
    }

    private function generateCode(): string
    {
        $nextId = (Repair::max('id') ?? 0) + 1;
        return 'REP' . str_pad((string) $nextId, 3, '0', STR_PAD_LEFT);
    }
}
