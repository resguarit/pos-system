<?php

namespace App\Http\Controllers;

use App\Models\Insurer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InsurerController extends Controller
{
    public function index(): JsonResponse
    {
        $insurers = Insurer::query()
            ->where('active', true)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $insurers]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $insurer = Insurer::create($validated);

        return response()->json(['data' => $insurer], 201);
    }

    public function show(Insurer $insurer): JsonResponse
    {
        return response()->json(['data' => $insurer]);
    }

    public function update(Request $request, Insurer $insurer): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'active' => 'sometimes|boolean',
        ]);

        $insurer->update($validated);

        return response()->json(['data' => $insurer]);
    }

    public function destroy(Insurer $insurer): JsonResponse
    {
        $insurer->delete();

        return response()->json(null, 204);
    }
}
