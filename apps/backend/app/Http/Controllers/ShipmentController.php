<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateShipmentRequest;
use App\Http\Requests\MoveShipmentRequest;
use App\Http\Requests\UpdateShipmentRequest;
use App\Http\Requests\UpsertShipmentStageRequest;
use App\Http\Requests\ConfigureVisibilityRequest;
use App\Interfaces\ShipmentServiceInterface;
use App\Interfaces\ShipmentStageServiceInterface;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use App\Exceptions\ConflictException;
use App\Exceptions\PermissionDeniedException;
use Exception;
use Barryvdh\DomPDF\Facade\Pdf;

class ShipmentController extends Controller
{
    private ShipmentServiceInterface $shipmentService;
    private ShipmentStageServiceInterface $stageService;

    public function __construct(
        ShipmentServiceInterface $shipmentService,
        ShipmentStageServiceInterface $stageService
    ) {
        $this->shipmentService = $shipmentService;
        $this->stageService = $stageService;
    }

    /**
     * Create a new shipment
     */
    public function store(CreateShipmentRequest $request): JsonResponse
    {
        try {
            $shipment = $this->shipmentService->create($request->validated(), Auth::user());

            return response()->json([
                'success' => true,
                'data' => $shipment
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Get shipments with filtering
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = $request->only(['stage_id', 'reference', 'created_from', 'created_to', 'per_page']);
            $shipments = $this->shipmentService->getShipments(Auth::user(), $filters);

            // Calcular estadísticas para una sola sucursal
            // Obtener branch_id del usuario
            $user = Auth::user();
            $branchId = $user->branch_id ?? null;

            $stats = null;
            if ($branchId) {
                $allShipments = Shipment::with('currentStage')
                    ->where('branch_id', $branchId)
                    ->get();

                // Contar por estado de manera precisa
                $totalPending = 0;
                $totalInProcess = 0;
                $totalCompleted = 0;

                foreach ($allShipments as $shipment) {
                    $stage = $shipment->currentStage;
                    if ($stage) {
                        // Pendiente: order = 1
                        if ($stage->order == 1) {
                            $totalPending++;
                        }
                        // En proceso: order = 2 o 3
                        elseif ($stage->order == 2 || $stage->order == 3) {
                            $totalInProcess++;
                        }
                        // Completado: order = 4
                        elseif ($stage->order == 4) {
                            $totalCompleted++;
                        }
                    }
                }

                $stats = [
                    'total' => $allShipments->count(),
                    'total_pending' => $totalPending,
                    'total_in_transit' => $totalInProcess,
                    'total_delivered' => $totalCompleted,
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $shipments,
                'stats' => $stats
            ], 200);
        } catch (PermissionDeniedException $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'PERMISSION_DENIED', 'message' => $e->getMessage()]
            ], 403);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Get shipments from multiple branches
     */
    public function multipleBranches(Request $request): JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'branch_ids' => 'required|array',
            'branch_ids.*' => 'integer|exists:branches,id',
            'stage_id' => 'nullable|integer',
            'reference' => 'nullable|string',
            'created_from' => 'nullable|date',
            'created_to' => 'nullable|date',
            'priority' => 'nullable|string',
            'city' => 'nullable|string',
            'customer' => 'nullable|string',
            'transporter' => 'nullable|string',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $branchIds = $request->input('branch_ids');
        $filters = $request->only(['stage_id', 'reference', 'created_from', 'created_to', 'priority', 'city', 'customer', 'transporter', 'per_page']);

        try {
            // Obtener todos los envíos de las sucursales especificadas
            $query = Shipment::with(['currentStage', 'creator.person', 'sales.customer.person', 'sales.receiptType'])
                ->whereIn('branch_id', $branchIds);

            // Aplicar filtros de stage_id
            if (!empty($filters['stage_id'])) {
                $query->where('current_stage_id', $filters['stage_id']);
            }

            // Aplicar filtros de referencia
            if (!empty($filters['reference'])) {
                $query->where('reference', 'like', '%' . $filters['reference'] . '%');
            }

            // Aplicar filtros de fechas
            if (!empty($filters['created_from'])) {
                $query->where('created_at', '>=', $filters['created_from']);
            }
            if (!empty($filters['created_to'])) {
                // Append end-of-day time to include entire day
                $createdTo = $filters['created_to'];
                if (strlen($createdTo) === 10) { // Date only format YYYY-MM-DD
                    $createdTo .= ' 23:59:59';
                }
                $query->where('created_at', '<=', $createdTo);
            }

            // Aplicar filtros de prioridad
            if (!empty($filters['priority'])) {
                $query->where('priority', $filters['priority']);
            }

            // Aplicar filtros de ciudad
            if (!empty($filters['city'])) {
                $query->where('shipping_city', 'like', '%' . $filters['city'] . '%');
            }

            // Aplicar filtros de cliente (buscar en las ventas asociadas)
            if (!empty($filters['customer'])) {
                $query->whereHas('sales', function ($q) use ($filters) {
                    $q->whereHas('customer', function ($cq) use ($filters) {
                        $cq->whereHas('person', function ($pq) use ($filters) {
                            $pq->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ['%' . $filters['customer'] . '%']);
                        });
                    });
                });
            }

            // Aplicar filtros de transportista (buscar en metadata)
            if (!empty($filters['transporter'])) {
                $query->whereRaw('JSON_EXTRACT(metadata, "$.transportista_id") LIKE ?', ['%' . $filters['transporter'] . '%']);
            }

            $perPage = $filters['per_page'] ?? 15;
            $shipments = $query->orderBy('created_at', 'desc')->paginate($perPage);

            // Eager load transporter users
            foreach ($shipments->items() as $shipment) {
                if (isset($shipment->metadata['transportista_id'])) {
                    $shipment->transporter = User::with('person')->find($shipment->metadata['transportista_id']);
                }
            }

            // Calcular estadísticas consolidadas
            // Obtener todos los envíos de las sucursales especificadas con eager loading
            $allShipments = Shipment::with('currentStage')
                ->whereIn('branch_id', $branchIds)
                ->get();

            // Contar por estado de manera más precisa
            $totalPending = 0;
            $totalInProcess = 0;
            $totalCompleted = 0;

            foreach ($allShipments as $shipment) {
                $stage = $shipment->currentStage;
                if ($stage) {
                    // Pendiente: order = 1
                    if ($stage->order == 1) {
                        $totalPending++;
                    }
                    // En proceso: order = 2
                    elseif ($stage->order == 2) {
                        $totalInProcess++;
                    }
                    // En camino: order = 3 (también cuenta como "en proceso" para el UI)
                    elseif ($stage->order == 3) {
                        $totalInProcess++;
                    }
                    // Completado/Entregado: order = 4
                    elseif ($stage->order == 4) {
                        $totalCompleted++;
                    }
                }
            }

            $stats = [
                'total' => $allShipments->count(),
                'total_pending' => $totalPending,
                'total_in_transit' => $totalInProcess,
                'total_delivered' => $totalCompleted,
                'total_branches' => count($branchIds)
            ];

            return response()->json([
                'success' => true,
                'data' => $shipments,
                'stats' => $stats
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Get a single shipment
     */
    public function show(int $id): JsonResponse
    {
        try {
            $shipment = $this->shipmentService->getShipment($id, Auth::user());

            if (!$shipment) {
                return response()->json([
                    'success' => false,
                    'error' => ['code' => 'NOT_FOUND', 'message' => 'Shipment not found']
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $shipment
            ], 200);
        } catch (PermissionDeniedException $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'PERMISSION_DENIED', 'message' => $e->getMessage()]
            ], 403);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Update shipment metadata
     */
    public function update(UpdateShipmentRequest $request, int $id): JsonResponse
    {
        try {
            $shipment = $this->shipmentService->updateShipment($id, $request->validated(), Auth::user());

            return response()->json([
                'success' => true,
                'data' => $shipment
            ], 200);
        } catch (ConflictException $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'CONFLICT', 'message' => $e->getMessage()]
            ], 409);
        } catch (PermissionDeniedException $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'PERMISSION_DENIED', 'message' => $e->getMessage()]
            ], 403);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Register payment for a shipment
     */
    public function pay(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'payment_method_id' => 'required|integer|exists:payment_methods,id',
                'notes' => 'nullable|string',
            ]);

            $shipment = $this->shipmentService->payShipment($id, $validated, Auth::user());

            return response()->json([
                'success' => true,
                'data' => $shipment
            ], 200);
        } catch (PermissionDeniedException $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'PERMISSION_DENIED', 'message' => $e->getMessage()]
            ], 403);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Delete a shipment
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $deleted = $this->shipmentService->deleteShipment($id, Auth::user());

            return response()->json([
                'success' => $deleted,
                'message' => $deleted ? 'Shipment deleted successfully' : 'Shipment not found'
            ], $deleted ? 200 : 404);
        } catch (PermissionDeniedException $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'PERMISSION_DENIED', 'message' => $e->getMessage()]
            ], 403);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Move shipment to another stage
     */
    public function move(int $id, MoveShipmentRequest $request): JsonResponse
    {
        try {
            $shipment = $this->shipmentService->moveShipment(
                $id,
                $request->stage_id,
                Auth::user(),
                $request->metadata ?? []
            );

            return response()->json([
                'success' => true,
                'data' => $shipment
            ], 200);
        } catch (ConflictException $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'CONFLICT', 'message' => $e->getMessage()]
            ], 409);
        } catch (PermissionDeniedException $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'PERMISSION_DENIED', 'message' => $e->getMessage()]
            ], 403);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Process webhook for shipment
     */
    public function webhook(int $id, Request $request): JsonResponse
    {
        try {
            $result = $this->shipmentService->processWebhook($id, $request->all(), Auth::user());

            return response()->json([
                'success' => true,
                'data' => $result
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Get shipment stages
     */
    public function stages(): JsonResponse
    {
        try {
            $stages = $this->stageService->getStages();

            return response()->json([
                'success' => true,
                'data' => $stages
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Create or update stage
     */
    public function upsertStage(UpsertShipmentStageRequest $request): JsonResponse
    {
        try {
            $stage = $this->stageService->upsertStage($request->validated());

            return response()->json([
                'success' => true,
                'data' => $stage
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Delete stage
     */
    public function deleteStage(int $id): JsonResponse
    {
        try {
            $deleted = $this->stageService->deleteStage($id);

            return response()->json([
                'success' => $deleted,
                'message' => $deleted ? 'Stage deleted successfully' : 'Stage not found'
            ], $deleted ? 200 : 404);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Configure attribute visibility
     */
    public function configureVisibility(ConfigureVisibilityRequest $request): JsonResponse
    {
        try {
            $this->stageService->configureVisibility(
                $request->stage_id,
                $request->role_id,
                $request->rules
            );

            return response()->json([
                'success' => true,
                'message' => 'Visibility configured successfully'
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]
            ], 500);
        }
    }

    /**
     * Download PDF for a shipment
     */
    public function downloadPdf(int $id)
    {
        try {
            $user = Auth::user();

            // Check if user has permission to print or view shipments
            if (!$user->hasPermission('imprimir_etiqueta_envio') && !$user->hasPermission('ver_envios')) {
                throw new PermissionDeniedException('No tienes permiso para imprimir etiquetas de envío');
            }

            $shipment = Shipment::with([
                'currentStage',
                'creator.person',
                'branch',
                'sales.customer.person',
                'sales.receiptType',
                'sales.items.product',
                'events',
            ])->findOrFail($id);

            // Load transporter if exists
            if (isset($shipment->metadata['transportista_id'])) {
                $shipment->transporter = User::with('person')->find($shipment->metadata['transportista_id']);
            }

            $data = ['shipment' => $shipment];
            $pdf = Pdf::loadView('pdf.shipment', $data);
            $filename = 'envio_' . ($shipment->reference ?? $shipment->id) . '.pdf';
            return $pdf->stream($filename);
        } catch (PermissionDeniedException $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'PERMISSION_DENIED', 'message' => $e->getMessage()]
            ], 403);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'ERROR', 'message' => 'Error generando PDF: ' . $e->getMessage()]
            ], 500);
        }
    }
}