<?php

namespace App\Http\Controllers;

use App\Interfaces\DocumentTypeServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DocumentTypeController extends Controller
{
    protected $documentTypeService;

    public function __construct(DocumentTypeServiceInterface $documentTypeService)
    {
        $this->documentTypeService = $documentTypeService;
    }

    public function index(): JsonResponse
    {
        $documentTypes = $this->documentTypeService->all();
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Tipos de documento obtenidos correctamente',
            'data' => $documentTypes
        ], 200);
    }

    public function show($id): JsonResponse
    {
        $documentType = $this->documentTypeService->find($id);
        if (!$documentType) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Tipo de documento no encontrado'
            ], 404);
        }
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Tipo de documento obtenido correctamente',
            'data' => $documentType
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:document_types,code',
            'description' => 'nullable|string|max:500'
        ]);

        try {
            $documentType = $this->documentTypeService->create($validatedData);
            return response()->json([
                'status' => 201,
                'success' => true,
                'message' => 'Tipo de documento creado correctamente',
                'data' => $documentType
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al crear el tipo de documento: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:document_types,code,' . $id,
            'description' => 'nullable|string|max:500'
        ]);

        try {
            $documentType = $this->documentTypeService->update($id, $validatedData);
            if (!$documentType) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Tipo de documento no encontrado'
                ], 404);
            }
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Tipo de documento actualizado correctamente',
                'data' => $documentType
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al actualizar el tipo de documento: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $deleted = $this->documentTypeService->delete($id);
            if (!$deleted) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Tipo de documento no encontrado'
                ], 404);
            }
            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Tipo de documento eliminado correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al eliminar el tipo de documento: ' . $e->getMessage()
            ], 500);
        }
    }
}
