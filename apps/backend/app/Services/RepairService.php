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
        $query = Repair::query()->with(['customer.person', 'branch', 'category', 'technician.person', 'sale', 'insurer', 'insuredCustomer.person']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%$search%")
                    ->orWhere('device', 'like', "%$search%")
                    ->orWhereHas('customer.person', function ($q2) use ($search) {
                        $q2->where(DB::raw("CONCAT(first_name, ' ', last_name)"), 'like', "%$search%");
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

        if (!empty($filters['branch_id'])) {
            $query->where('branch_id', $filters['branch_id']);
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
        return Repair::with(['customer.person', 'branch', 'category', 'technician.person', 'notes.user.person', 'sale', 'insurer', 'insuredCustomer.person'])->find($id);
    }


    public function create(array $data): Repair
    {
        return DB::transaction(function () use ($data) {
            $data['code'] = $data['code'] ?? $this->generateCode();
            $data['status'] = $data['status'] ?? 'Recibido';
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

    public function delete(int $id): void
    {
        $repair = Repair::findOrFail($id);
        $repair->delete();
    }

    public function updateStatus(int $id, string $status): Repair
    {
        $repair = Repair::findOrFail($id);
        $repair->update(['status' => $status]);
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
        if (!empty($filters['branch_id']))
            $base->where('branch_id', $filters['branch_id']);

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

    private function generateCode(): string
    {
        $nextId = (Repair::max('id') ?? 0) + 1;
        return 'REP' . str_pad((string) $nextId, 3, '0', STR_PAD_LEFT);
    }
}
