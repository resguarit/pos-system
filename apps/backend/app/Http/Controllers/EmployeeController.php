<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Person;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::with(['person', 'branch', 'branches', 'user.person', 'user.role']);

        // Search functionality
        if ($request->has('search') && $request->search) {
            $searchTerm = $request->search;
            $query->whereHas('person', function ($q) use ($searchTerm) {
                $q->where('first_name', 'like', "%{$searchTerm}%")
                    ->orWhere('last_name', 'like', "%{$searchTerm}%")
                    ->orWhere('cuit', 'like', "%{$searchTerm}%")
                    ->orWhere('phone', 'like', "%{$searchTerm}%");
            })->orWhere('job_title', 'like', "%{$searchTerm}%");
        }

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $perPage = $request->input('limit', $request->input('per_page', 15));
        $employees = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $employees->items(),
            'current_page' => $employees->currentPage(),
            'last_page' => $employees->lastPage(),
            'per_page' => $employees->perPage(),
            'total' => $employees->total(),
        ]);
    }

    /**
     * Get users that can be linked to employees (not already linked)
     */
    public function availableUsers()
    {
        $linkedUserIds = Employee::whereNotNull('user_id')->pluck('user_id');

        $users = User::with(['person', 'role'])
            ->whereNotIn('id', $linkedUserIds)
            ->where('active', true)
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'email' => $user->email,
                    'full_name' => $user->person ? $user->person->full_name : $user->email,
                    'person' => $user->person,
                    'role' => $user->role ? ['id' => $user->role->id, 'name' => $user->role->name] : null,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id|unique:employees,user_id',
            'first_name' => 'required_without:user_id|string|max:255',
            'last_name' => 'required_without:user_id|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'documento' => 'nullable|string|max:20',
            'cuit' => 'nullable|string|max:11',
            'branch_id' => 'nullable|exists:branches,id', // Keep for backwards compatibility
            'branch_ids' => 'nullable|array', // New: multiple branches
            'branch_ids.*' => 'exists:branches,id',
            'job_title' => 'nullable|string|max:255',
            'salary' => 'required|numeric|min:0',
            'hire_date' => 'nullable|date',
            'status' => 'in:active,inactive,terminated',
        ]);

        // Ensure at least one branch is provided
        if (empty($validated['branch_id']) && empty($validated['branch_ids'])) {
            return response()->json([
                'success' => false,
                'message' => 'At least one branch is required'
            ], 422);
        }

        return DB::transaction(function () use ($validated) {
            $personId = null;
            $userId = null;

            // If linking to existing user, use their person_id and role for job_title
            if (!empty($validated['user_id'])) {
                $user = User::with('role')->findOrFail($validated['user_id']);
                $personId = $user->person_id;
                $userId = $user->id;

                // Use role name as default job_title if not explicitly provided
                if (empty($validated['job_title']) && $user->role) {
                    $validated['job_title'] = $user->role->name;
                }
            } else {
                // Create new Person
                $person = Person::create([
                    'first_name' => $validated['first_name'],
                    'last_name' => $validated['last_name'],
                    'address' => $validated['address'] ?? null,
                    'phone' => $validated['phone'] ?? null,
                    'cuit' => $validated['cuit'] ?? null,
                    'documento' => $validated['documento'] ?? null,
                    'person_type' => 'employee',
                ]);
                $personId = $person->id;
            }

            // Determine branches to sync
            $branchIds = [];
            if (!empty($validated['branch_ids'])) {
                $branchIds = $validated['branch_ids'];
            } elseif (!empty($validated['branch_id'])) {
                $branchIds = [$validated['branch_id']];
            }

            // Create Employee (branch_id stores the primary/first branch for backwards compatibility)
            $employee = Employee::create([
                'person_id' => $personId,
                'user_id' => $userId,
                'branch_id' => $branchIds[0] ?? null,
                'job_title' => $validated['job_title'] ?? null,
                'salary' => $validated['salary'],
                'hire_date' => $validated['hire_date'] ?? now(),
                'status' => $validated['status'] ?? 'active',
            ]);

            // Sync all branches to pivot table
            if (!empty($branchIds)) {
                $employee->branches()->sync($branchIds);
            }

            return response()->json([
                'success' => true,
                'message' => 'Employee created successfully',
                'data' => $employee->load(['person', 'branch', 'branches', 'user.person'])
            ], 201);
        });
    }

    public function show(Employee $employee)
    {
        return response()->json([
            'success' => true,
            'data' => $employee->load(['person', 'branch', 'branches', 'user.person', 'user.role'])
        ]);
    }

    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id|unique:employees,user_id,' . $employee->id,
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'cuit' => 'nullable|string|max:11',
            'documento' => 'nullable|string|max:20',
            'branch_id' => 'nullable|exists:branches,id', // Keep for backwards compatibility
            'branch_ids' => 'nullable|array', // Multiple branches support
            'branch_ids.*' => 'exists:branches,id',
            'job_title' => 'nullable|string|max:255',
            'salary' => 'sometimes|numeric|min:0',
            'hire_date' => 'nullable|date',
            'status' => 'in:active,inactive,terminated',
        ]);

        return DB::transaction(function () use ($request, $employee, $validated) {
            // Handle user linkage changes
            if (array_key_exists('user_id', $validated)) {
                if ($validated['user_id']) {
                    // Link to a different user
                    $user = User::findOrFail($validated['user_id']);
                    $employee->user_id = $user->id;
                    // Optionally update person_id to match user's person
                    $employee->person_id = $user->person_id;
                } else {
                    // Unlink from user (keep existing person data)
                    $employee->user_id = null;
                }
                $employee->save();
            }


            // Update Person data
            // For linked employees: only allow updating phone, address, cuit, documento (not first_name/last_name)
            // For non-linked employees: allow updating all person fields
            if ($employee->user_id) {
                // Employee linked to user: only update these specific fields
                $personData = array_intersect_key($validated, array_flip(['address', 'phone', 'cuit', 'documento']));
            } else {
                // Employee not linked: allow all person updates including name
                $personData = array_intersect_key($validated, array_flip(['first_name', 'last_name', 'address', 'phone', 'cuit', 'documento']));
            }
            if (!empty($personData)) {
                $employee->person->update($personData);
            }

            // Update Employee fields (excluding branch_ids which is handled separately)
            $employeeData = array_intersect_key($validated, array_flip(['branch_id', 'job_title', 'salary', 'hire_date', 'status']));
            if (!empty($employeeData)) {
                $employee->update($employeeData);
            }

            // Handle multiple branches sync
            if (isset($validated['branch_ids'])) {
                $branchIds = $validated['branch_ids'];
                $employee->branches()->sync($branchIds);

                // Update primary branch_id to first in list for backwards compatibility
                if (!empty($branchIds)) {
                    $employee->update(['branch_id' => $branchIds[0]]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Employee updated successfully',
                'data' => $employee->fresh()->load(['person', 'branch', 'branches', 'user.person'])
            ]);
        });
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();
        return response()->json([
            'success' => true,
            'message' => 'Employee deleted successfully'
        ]);
    }
}
