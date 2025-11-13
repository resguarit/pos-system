<?php

namespace App\Http\Controllers;

use App\Interfaces\AuditServiceInterface;
use App\Http\Requests\GetAuditsRequest;
use App\Http\Requests\GetAuditStatisticsRequest;
use App\Http\Requests\GetUserAuditsRequest;
use App\Http\Requests\GetModelAuditsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AuditController extends Controller
{
    protected $auditService;

    public function __construct(AuditServiceInterface $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Obtener todas las auditorías con filtros opcionales
     *
     * @param GetAuditsRequest $request
     * @return JsonResponse
     */
    public function index(GetAuditsRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();
            
            // Sanitizar búsqueda
            if (isset($validated['search'])) {
                $validated['search'] = Str::limit(trim($validated['search']), 255);
            }

            $filters = [
                'user_id' => $validated['user_id'] ?? null,
                'subject_type' => $validated['subject_type'] ?? null,
                'log_name' => $validated['log_name'] ?? null,
                'event' => $validated['event'] ?? null,
                'search' => $validated['search'] ?? null,
                'date_from' => $validated['date_from'] ?? null,
                'date_to' => $validated['date_to'] ?? null,
                'ip_address' => $validated['ip_address'] ?? null,
            ];

            $perPage = min($validated['per_page'] ?? 50, 100); // Máximo 100

            $audits = $this->auditService->getAudits($filters, $perPage);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Auditorías obtenidas correctamente',
                'data' => $audits->items(),
                'meta' => [
                    'current_page' => $audits->currentPage(),
                    'last_page' => $audits->lastPage(),
                    'per_page' => $audits->perPage(),
                    'total' => $audits->total(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error("Error obteniendo auditorías: " . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener auditorías',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener una auditoría específica por ID
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            // Verificar permiso
            if (!auth()->user()?->hasPermission('ver_auditorias')) {
                return response()->json([
                    'status' => 403,
                    'success' => false,
                    'message' => 'No tienes permiso para ver auditorías',
                ], 403);
            }

            $audit = $this->auditService->getAuditById($id);

            if (!$audit) {
                return response()->json([
                    'status' => 404,
                    'success' => false,
                    'message' => 'Auditoría no encontrada',
                ], 404);
            }

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Auditoría obtenida correctamente',
                'data' => $audit,
            ]);
        } catch (\Exception $e) {
            Log::error("Error obteniendo auditoría {$id}: " . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener auditoría',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener auditorías de un usuario específico
     *
     * @param GetUserAuditsRequest $request
     * @param int $userId
     * @return JsonResponse
     */
    public function getUserAudits(GetUserAuditsRequest $request, int $userId): JsonResponse
    {
        try {
            $validated = $request->validated();
            $perPage = min($validated['per_page'] ?? 50, 100); // Máximo 100
            $audits = $this->auditService->getUserAudits($userId, $perPage);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Auditorías del usuario obtenidas correctamente',
                'data' => $audits->items(),
                'meta' => [
                    'current_page' => $audits->currentPage(),
                    'last_page' => $audits->lastPage(),
                    'per_page' => $audits->perPage(),
                    'total' => $audits->total(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error("Error obteniendo auditorías del usuario {$userId}: " . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener auditorías del usuario',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener auditorías de un modelo específico
     *
     * @param GetModelAuditsRequest $request
     * @param string $subjectType
     * @param int $subjectId
     * @return JsonResponse
     */
    public function getModelAudits(GetModelAuditsRequest $request, string $subjectType, int $subjectId): JsonResponse
    {
        try {
            $validated = $request->validated();
            $perPage = min($validated['per_page'] ?? 50, 100); // Máximo 100
            $audits = $this->auditService->getModelAudits($subjectType, $subjectId, $perPage);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Auditorías del modelo obtenidas correctamente',
                'data' => $audits->items(),
                'meta' => [
                    'current_page' => $audits->currentPage(),
                    'last_page' => $audits->lastPage(),
                    'per_page' => $audits->perPage(),
                    'total' => $audits->total(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error("Error obteniendo auditorías del modelo {$subjectType}#{$subjectId}: " . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener auditorías del modelo',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener estadísticas de auditorías
     *
     * @param GetAuditStatisticsRequest $request
     * @return JsonResponse
     */
    public function statistics(GetAuditStatisticsRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();
            $filters = [
                'date_from' => $validated['date_from'] ?? null,
                'date_to' => $validated['date_to'] ?? null,
            ];

            $statistics = $this->auditService->getStatistics($filters);

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Estadísticas obtenidas correctamente',
                'data' => $statistics,
            ]);
        } catch (\Exception $e) {
            Log::error("Error obteniendo estadísticas de auditorías: " . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener estadísticas',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener opciones de filtros disponibles
     *
     * @return JsonResponse
     */
    public function filterOptions(): JsonResponse
    {
        try {
            // Verificar permiso manualmente ya que no hay Request
            if (!auth()->user()?->hasPermission('ver_auditorias')) {
                return response()->json([
                    'status' => 403,
                    'success' => false,
                    'message' => 'No tienes permiso para ver auditorías',
                ], 403);
            }

            // Cachear opciones de filtros por 10 minutos
            $subjectTypes = cache()->remember('audit_filter_subject_types', 600, function () {
                return $this->auditService->getAvailableSubjectTypes();
            });

            $logNames = cache()->remember('audit_filter_log_names', 600, function () {
                return $this->auditService->getAvailableLogNames();
            });

            $users = cache()->remember('audit_filter_users', 600, function () {
                return $this->auditService->getAvailableUsers();
            });

            return response()->json([
                'status' => 200,
                'success' => true,
                'message' => 'Opciones de filtros obtenidas correctamente',
                'data' => [
                    'subject_types' => $subjectTypes,
                    'log_names' => $logNames,
                    'users' => $users,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error("Error obteniendo opciones de filtros: " . $e->getMessage());
            return response()->json([
                'status' => 500,
                'success' => false,
                'message' => 'Error al obtener opciones de filtros',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

