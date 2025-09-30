<?php

namespace App\Http\Controllers;

use App\Interfaces\IvaServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class IvaController extends Controller
{
    protected $ivaService;

    public function __construct(IvaServiceInterface $ivaService)
    {
        $this->ivaService = $ivaService;
    }

    public function index(): JsonResponse
    {
        $ivas = $this->ivaService->getAllIvas();
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'IVAs obtenidos correctamente',
            'data' => $ivas
        ], 200);
    }

    public function show($id): JsonResponse
    {
        $iva = $this->ivaService->getIvaById($id);
        if (!$iva) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'IVA no encontrado'
            ], 404);
        }
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'IVA obtenido correctamente',
            'data' => $iva
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'percentage' => 'required|numeric|min:0|max:100',
            'description' => 'nullable|string|max:500'
        ]);

        try {
            $iva = $this->ivaService->createIva($validatedData);
            return response()->json([
                'status' => 201,
                'success' => true,
                'message' => 'IVA creado correctamente',
                'data' => $iva
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al crear el IVA: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'percentage' => 'required|numeric|min:0|max:100',
            'description' => 'nullable|string|max:500'
        ]);

        try {
            $iva = $this->ivaService->updateIva($id, $validatedData);
            if (!$iva) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'IVA no encontrado'
                ], 404);
            }
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'IVA actualizado correctamente',
                'data' => $iva
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al actualizar el IVA: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $deleted = $this->ivaService->deleteIva($id);
            if (!$deleted) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'IVA no encontrado'
                ], 404);
            }
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'IVA eliminado correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al eliminar el IVA: ' . $e->getMessage()
            ], 500);
        }
    }
}
