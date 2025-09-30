<?php

namespace App\Http\Controllers;

use App\Models\MovementType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class MovementTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $movementTypes = MovementType::all();
        return response()->json([
            'message' => 'Tipos de movimiento obtenidos',
            'data' => $movementTypes
        ], 200);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = \Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:movement_types,name',
            'description' => 'nullable|string|max:255',
            'operation_type' => 'required|in:entrada,salida',
            'is_cash_movement' => 'boolean',
            'is_current_account_movement' => 'boolean',
            'active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only([
            'name',
            'description',
            'operation_type',
            'is_cash_movement',
            'is_current_account_movement',
            'active',
        ]);

        // Valores por defecto
        $data['is_cash_movement'] = array_key_exists('is_cash_movement', $data) ? (bool)$data['is_cash_movement'] : true;
        $data['is_current_account_movement'] = array_key_exists('is_current_account_movement', $data) ? (bool)$data['is_current_account_movement'] : false;
        $data['active'] = array_key_exists('active', $data) ? (bool)$data['active'] : true;

        $movementType = MovementType::create($data);
        return response()->json([
            'message' => 'Tipo de movimiento creado exitosamente',
            'data' => $movementType
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $movementType = MovementType::find($id);
        
        if (!$movementType) {
            return response()->json(['error' => 'Tipo de movimiento no encontrado'], 404);
        }

        return response()->json([
            'message' => 'Tipo de movimiento obtenido',
            'data' => $movementType
        ], 200);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $movementType = MovementType::find($id);
        
        if (!$movementType) {
            return response()->json(['error' => 'Tipo de movimiento no encontrado'], 404);
        }

        $validator = \Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:movement_types,name,' . $id,
            'description' => 'nullable|string|max:255',
            'operation_type' => 'required|in:entrada,salida',
            'is_cash_movement' => 'boolean',
            'is_current_account_movement' => 'boolean',
            'active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only([
            'name',
            'description',
            'operation_type',
            'is_cash_movement',
            'is_current_account_movement',
            'active',
        ]);

        $movementType->update($data);
        return response()->json([
            'message' => 'Tipo de movimiento actualizado exitosamente',
            'data' => $movementType
        ], 200);
    }

    public function destroy(int $id): JsonResponse
    {
        $movementType = MovementType::find($id);
        
        if (!$movementType) {
            return response()->json(['error' => 'Tipo de movimiento no encontrado'], 404);
        }

        $movementType->delete();
        return response()->json([
            'message' => 'Tipo de movimiento eliminado exitosamente'
        ], 200);
    }
}
