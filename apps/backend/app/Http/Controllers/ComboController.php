<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Interfaces\ComboServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class ComboController extends Controller
{
    public function __construct(
        private readonly ComboServiceInterface $comboService
    ) {}

    /**
     * Listar todos los combos
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = [
                'active_only' => $request->boolean('active_only'),
                'branch_id' => $request->integer('branch_id') ?: null,
            ];

            $combos = $this->comboService->getAll($filters);

            return response()->json([
                'success' => true,
                'data' => $combos,
                'message' => 'Combos obtenidos exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener combos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener un combo específico
     */
    public function show(int $id): JsonResponse
    {
        try {
            $combo = $this->comboService->getById($id);
            
            if (!$combo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Combo no encontrado'
                ], 404);
            }
            
            $priceCalculation = $this->comboService->calculatePrice($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'combo' => $combo,
                    'price_calculation' => $priceCalculation,
                ],
                'message' => 'Combo obtenido exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener combo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear un nuevo combo
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:combos,name',
                'description' => 'nullable|string|max:1000',
                'discount_type' => 'required|in:percentage,fixed_amount',
                'discount_value' => 'required|numeric|min:0',
                'is_active' => 'boolean',
                'notes' => 'nullable|string|max:1000',
                'items' => 'required|array|min:1',
                'items.*.product_id' => 'required|exists:products,id',
                'items.*.quantity' => 'required|integer|min:1',
            ]);

            // Validación adicional usando el servicio
            $validationErrors = $this->comboService->validateComboData($validated);
            if (!empty($validationErrors)) {
                throw ValidationException::withMessages([
                    'validation' => $validationErrors
                ]);
            }

            $combo = $this->comboService->create($validated);

            return response()->json([
                'success' => true,
                'data' => $combo,
                'message' => 'Combo creado exitosamente'
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear combo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar un combo existente
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255|unique:combos,name,' . $id,
                'description' => 'nullable|string|max:1000',
                'discount_type' => 'sometimes|in:percentage,fixed_amount',
                'discount_value' => 'sometimes|numeric|min:0',
                'is_active' => 'boolean',
                'notes' => 'nullable|string|max:1000',
                'items' => 'sometimes|array|min:1',
                'items.*.product_id' => 'required_with:items|exists:products,id',
                'items.*.quantity' => 'required_with:items|integer|min:1',
            ]);

            // Validación adicional usando el servicio
            $validationErrors = $this->comboService->validateComboData($validated);
            if (!empty($validationErrors)) {
                throw ValidationException::withMessages([
                    'validation' => $validationErrors
                ]);
            }

            $combo = $this->comboService->update($id, $validated);

            return response()->json([
                'success' => true,
                'data' => $combo,
                'message' => 'Combo actualizado exitosamente'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar combo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar un combo (soft delete)
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $deleted = $this->comboService->delete($id);

            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Combo no encontrado'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Combo eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar combo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calcular precio dinámico de un combo
     */
    public function calculatePrice(int $id): JsonResponse
    {
        try {
            $priceCalculation = $this->comboService->calculatePrice($id);

            return response()->json([
                'success' => true,
                'data' => $priceCalculation,
                'message' => 'Precio calculado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al calcular precio: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verificar disponibilidad de combo en sucursal
     */
    public function checkAvailability(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'branch_id' => 'required|integer|exists:branches,id',
                'quantity' => 'integer|min:1|max:1000',
            ]);

            $availability = $this->comboService->checkAvailability(
                $id,
                (int) $validated['branch_id'],
                (int) ($validated['quantity'] ?? 1)
            );

            return response()->json([
                'success' => true,
                'data' => $availability,
                'message' => 'Disponibilidad verificada exitosamente'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al verificar disponibilidad: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener combos disponibles en una sucursal específica
     */
    public function getAvailableInBranch(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'branch_id' => 'required|integer|exists:branches,id',
            ]);

            $combos = $this->comboService->getAvailableInBranch((int) $validated['branch_id']);

            return response()->json([
                'success' => true,
                'data' => $combos,
                'message' => 'Combos disponibles obtenidos exitosamente'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener combos disponibles: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de combos
     */
    public function statistics(): JsonResponse
    {
        try {
            $statistics = $this->comboService->getStatistics();

            return response()->json([
                'success' => true,
                'data' => $statistics,
                'message' => 'Estadísticas obtenidas exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage()
            ], 500);
        }
    }
}