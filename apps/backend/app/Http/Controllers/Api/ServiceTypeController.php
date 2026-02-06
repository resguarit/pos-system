<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServiceType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ServiceTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = ServiceType::query();

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Pagination
        $perPage = $request->input('per_page', 15);

        if ($request->boolean('all', false)) {
            $serviceTypes = $query->orderBy('name')->get();
            return response()->json($serviceTypes);
        }

        $serviceTypes = $query->orderBy('name')->paginate($perPage);

        return response()->json($serviceTypes);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'billing_cycle' => 'required|in:monthly,quarterly,annual,one_time',
            'icon' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $serviceType = ServiceType::create($validator->validated());

        return response()->json($serviceType, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(ServiceType $serviceType)
    {
        return response()->json($serviceType->load('clientServices.customer'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ServiceType $serviceType)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'billing_cycle' => 'sometimes|required|in:monthly,quarterly,annual,one_time',
            'icon' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();

        \Illuminate\Support\Facades\DB::transaction(function () use ($serviceType, $validated) {
            $oldName = $serviceType->name;
            $serviceType->update($validated);

            // Propagate name change to linked client services IF they matched the old name
            if (isset($validated['name']) && $oldName !== $validated['name']) {
                \App\Models\ClientService::where('service_type_id', $serviceType->id)
                    ->where('name', $oldName)
                    ->update(['name' => $validated['name']]);
            }
        });

        return response()->json($serviceType);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ServiceType $serviceType)
    {
        // Soft delete
        $serviceType->delete();

        return response()->json(['message' => 'Service type deleted successfully']);
    }
}
