<?php

namespace App\Http\Controllers;

use App\Interfaces\SupplierServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SupplierController extends Controller
{
    protected $supplierService;

    public function __construct(SupplierServiceInterface $supplierService)
    {
        $this->supplierService = $supplierService;
    }

    public function index(Request $request): JsonResponse
    {
        $query = \App\Models\Supplier::query()->with('currentAccount');

        // Agregar filtro de búsqueda si está presente
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                    ->orWhere('contact_name', 'like', "%$search%")
                    ->orWhere('email', 'like', "%$search%");
            });
        }

        // Paginación
        $perPage = $request->get('per_page', $request->get('limit', 8));
        $perPage = min($perPage, 10000); // Limitar a máximo 1000 registros por página
        $suppliers = $query->paginate($perPage);

        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Proveedores obtenidos correctamente',
            'data' => $suppliers->items(),
            'total' => $suppliers->total(),
            'current_page' => $suppliers->currentPage(),
            'last_page' => $suppliers->lastPage(),
            'per_page' => $suppliers->perPage(),
            'from' => $suppliers->firstItem(),
            'to' => $suppliers->lastItem(),
        ], 200);
    }

    public function show($id): JsonResponse
    {
        $supplier = $this->supplierService->getSupplierById($id);
        if (!$supplier) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Proveedor no encontrado'
            ], 404);
        }
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Proveedor obtenido correctamente',
            'data' => $supplier
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:active,pending,inactive',
            'cuit' => 'nullable|string|max:20',
        ]);
        // Map frontend fields if present
        if ($request->has('contact_person')) {
            $validatedData['contact_name'] = $request->input('contact_person');
        }
        if ($request->has('tax_id')) {
            $validatedData['cuit'] = $request->input('tax_id');
        }
        $supplier = $this->supplierService->createSupplier($validatedData);
        return response()->json([
            'status' => 201,
            'success' => true,
            'message' => 'Proveedor creado correctamente',
            'data' => $supplier
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:active,pending,inactive',
            'cuit' => 'nullable|string|max:20',
        ]);
        // Map frontend fields if present
        if ($request->has('contact_person')) {
            $validatedData['contact_name'] = $request->input('contact_person');
        }
        if ($request->has('tax_id')) {
            $validatedData['cuit'] = $request->input('tax_id');
        }
        $supplier = $this->supplierService->updateSupplier($id, $validatedData);
        if (!$supplier) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Proveedor no encontrado'
            ], 404);
        }
        return response()->json([
            'status' => 200,
            'success' => true,
            'message' => 'Proveedor actualizado correctamente',
            'data' => $supplier
        ], 200);
    }

    public function destroy($id): JsonResponse
    {
        $result = $this->supplierService->deleteSupplier($id);
        if (!$result) {
            return response()->json([
                'status' => 404,
                'success' => false,
                'message' => 'Proveedor no encontrado'
            ], 404);
        }
        return response()->json([
            'status' => 204,
            'success' => true,
            'message' => 'Proveedor eliminado correctamente'
        ], 204);
    }

    public function checkName($name): JsonResponse
    {
        try {
            $exists = $this->supplierService->checkNameExists($name);

            return response()->json([
                'exists' => $exists
            ]);
        } catch (\Exception $e) {
            \Log::error('Error checking supplier name: ' . $e->getMessage());
            return response()->json([
                'exists' => false
            ], 500);
        }
    }
}