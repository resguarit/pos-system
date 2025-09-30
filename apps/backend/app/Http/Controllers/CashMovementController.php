<?php

namespace App\Http\Controllers;

use App\Interfaces\CashMovementServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class CashMovementController extends Controller
{
    protected CashMovementServiceInterface $cashMovementService;

    public function __construct(CashMovementServiceInterface $cashMovementService)
    {
        $this->cashMovementService = $cashMovementService;
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'cash_register_id' => 'required|integer|exists:cash_registers,id',
            'movement_type_id' => 'required|integer|exists:movement_types,id',
            'payment_method_id' => 'nullable|integer|exists:payment_methods,id', // Añadir validación
            'amount' => 'required|numeric|not_in:0',
            'description' => 'required|string|max:500',
            'user_id' => 'required|integer|exists:users,id',
            'reference_type' => 'nullable|string',
            'reference_id' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $movement = $this->cashMovementService->createMovement($request->all());
            return response()->json([
                'message' => 'Movimiento creado exitosamente',
                'data' => $movement
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'cash_register_id' => 'required|integer|exists:cash_registers,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $movements = $this->cashMovementService->getMovementsByRegister(
            $request->input('cash_register_id'),
            $request
        );

        return response()->json($movements);
    }

    public function show(int $id): JsonResponse
    {
        try {
            $movement = $this->cashMovementService->getMovementById($id);
            return response()->json([
                'message' => 'Movimiento obtenido',
                'data' => $movement
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Movimiento no encontrado'], 404);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $this->cashMovementService->deleteMovement($id);
            return response()->json([
                'message' => 'Movimiento eliminado exitosamente'
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
