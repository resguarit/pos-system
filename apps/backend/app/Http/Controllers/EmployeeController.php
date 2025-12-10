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
        $query = Employee::with(['person', 'branch', 'user.person']);

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

        $users = User::with('person')
            ->whereNotIn('id', $linkedUserIds)
            ->where('active', true)
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'email' => $user->email,
                    'full_name' => $user->person ? $user->person->full_name : $user->email,
                    'person' => $user->person,
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
            'branch_id' => 'required|exists:branches,id',
            'job_title' => 'nullable|string|max:255',
            'salary' => 'required|numeric|min:0',
            'hire_date' => 'nullable|date',
            'status' => 'in:active,inactive,terminated',
        ]);

        return DB::transaction(function () use ($validated) {
            $personId = null;
            $userId = null;

            // If linking to existing user, use their person_id
            if (!empty($validated['user_id'])) {
                $user = User::findOrFail($validated['user_id']);
                $personId = $user->person_id;
                $userId = $user->id;
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

            // Create Employee
            $employee = Employee::create([
                'person_id' => $personId,
                'user_id' => $userId,
                'branch_id' => $validated['branch_id'],
                'job_title' => $validated['job_title'] ?? null,
                'salary' => $validated['salary'],
                'hire_date' => $validated['hire_date'] ?? now(),
                'status' => $validated['status'] ?? 'active',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Employee created successfully',
                'data' => $employee->load(['person', 'branch', 'user.person'])
            ], 201);
        });
    }

    public function show(Employee $employee)
    {
        return response()->json([
            'success' => true,
            'data' => $employee->load(['person', 'branch', 'user.person'])
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
            'branch_id' => 'sometimes|exists:branches,id',
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

            // Update Person data (only if not linked to a user, or updating person directly)
            if (!$employee->user_id) {
                $personData = array_intersect_key($validated, array_flip(['first_name', 'last_name', 'address', 'phone', 'cuit', 'documento']));
                if (!empty($personData)) {
                    $employee->person->update($personData);
                }
            }

            // Update Employee fields
            $employeeData = array_intersect_key($validated, array_flip(['branch_id', 'job_title', 'salary', 'hire_date', 'status']));
            if (!empty($employeeData)) {
                $employee->update($employeeData);
            }

            return response()->json([
                'success' => true,
                'message' => 'Employee updated successfully',
                'data' => $employee->fresh()->load(['person', 'branch', 'user.person'])
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
