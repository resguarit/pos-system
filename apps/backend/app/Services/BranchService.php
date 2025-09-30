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
        // Obtener conteo exacto de usuarios activos por sucursal desde la tabla pivote y users (no soft deleted)
        $userCounts = DB::table('branch_user')
            ->join('users', 'branch_user.user_id', '=', 'users.id')
            ->whereNull('users.deleted_at')
            ->select('branch_user.branch_id', DB::raw('COUNT(branch_user.user_id) as count'))
            ->groupBy('branch_user.branch_id')
            ->pluck('count', 'branch_id');
        // Asignar el conteo a cada sucursal
        foreach ($branches as $branch) {
            $branch->users_count = $userCounts[$branch->id] ?? 0;
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
        // Obtener los user_id asociados a la sucursal desde la tabla pivote
        $userIds = DB::table('branch_user')
            ->where('branch_id', $branchId)
            ->pluck('user_id');
        // Traer los usuarios completos con persona y rol
        return \App\Models\User::with(['person', 'role'])
            ->whereIn('id', $userIds)
            ->get();
    }

    public function checkNameExists($name): bool
    {
        return Branch::where('description', $name)->exists();
    }
}