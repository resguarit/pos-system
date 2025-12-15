<?php

namespace App\Services;

use App\Interfaces\BranchServiceInterface;
use App\Models\Branch;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB; // import DB facade

class BranchService implements BranchServiceInterface
{
    public function getAllBranches(): \Illuminate\Support\Collection
    {
        $branches = Branch::with('manager.person')->get();

        // Obtener conteo exacto de empleados por sucursal desde la tabla pivote
        $employeeCounts = DB::table('employee_branch')
            ->join('employees', 'employee_branch.employee_id', '=', 'employees.id')
            ->whereNull('employees.deleted_at')
            ->select('employee_branch.branch_id', DB::raw('COUNT(employee_branch.employee_id) as count'))
            ->groupBy('employee_branch.branch_id')
            ->pluck('count', 'branch_id');

        // Asignar el conteo a cada sucursal
        foreach ($branches as $branch) {
            $branch->employees_count = $employeeCounts[$branch->id] ?? 0;
        }
        return $branches;
    }

    public function getBranchById($id): ?Branch
    {
        return Branch::with('manager')->find($id);
    }

    public function createBranch(array $data): Branch
    {
        return Branch::create($data);
    }

    public function updateBranch($id, array $data): ?Branch
    {
        $branch = Branch::find($id);
        if ($branch) {
            $branch->update($data);
        }
        return $branch;
    }

    public function deleteBranch($id): bool
    {
        $branch = Branch::find($id);
        if ($branch) {
            return $branch->delete();
        }
        return false;
    }

    public function getActiveBranches(): Collection
    {
        return Branch::where('status', true)
            ->with('manager')
            ->get();
    }

    public function getBranchPersonnel($branchId)
    {
        // Obtener los employee_id asociados a la sucursal desde la tabla pivote
        $employeeIds = DB::table('employee_branch')
            ->where('branch_id', $branchId)
            ->pluck('employee_id');

        // Traer los empleados completos con persona y rol de usuario si existe
        return \App\Models\Employee::with(['person', 'user.role'])
            ->whereIn('id', $employeeIds)
            ->get();
    }

    public function checkNameExists($name): bool
    {
        return Branch::where('description', $name)->exists();
    }
}