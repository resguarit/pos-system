<?php

namespace App\Http\Controllers;

use App\Interfaces\MeasureServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MeasureController extends Controller
{
    protected $measureService;

    public function __construct(MeasureServiceInterface $measureService)
    {
        $this->measureService = $measureService;
    }

    public function index(): JsonResponse
    {
        $measures = $this->measureService->getAllMeasures();
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Unidades de medida obtenidas correctamente',
            'data' => $measures
        ], 200);
    }

    public function show($id): JsonResponse
    {
        $measure = $this->measureService->getMeasureById($id);
        if (!$measure) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Unidad de medida no encontrada'
            ], 404);
        }
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Unidad de medida obtenida correctamente',
            'data' => $measure
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255|unique:measures,name',
            'abbreviation' => 'required|string|max:10|unique:measures,abbreviation',
            'description' => 'nullable|string|max:500'
        ]);

        try {
            $measure = $this->measureService->createMeasure($validatedData);
            return response()->json([
                'status' => 201,
                'success' => true,
                'message' => 'Unidad de medida creada correctamente',
                'data' => $measure
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al crear la unidad de medida: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255|unique:measures,name,' . $id,
            'abbreviation' => 'required|string|max:10|unique:measures,abbreviation,' . $id,
            'description' => 'nullable|string|max:500'
        ]);

        try {
            $measure = $this->measureService->updateMeasure($id, $validatedData);
            if (!$measure) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Unidad de medida no encontrada'
                ], 404);
            }
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Unidad de medida actualizada correctamente',
                'data' => $measure
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al actualizar la unidad de medida: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $deleted = $this->measureService->deleteMeasure($id);
            if (!$deleted) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Unidad de medida no encontrada'
                ], 404);
            }
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Unidad de medida eliminada correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al eliminar la unidad de medida: ' . $e->getMessage()
            ], 500);
        }
    }
}
