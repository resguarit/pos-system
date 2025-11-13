<?php

namespace App\Http\Controllers;

use App\Interfaces\AuditServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

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
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $filters = [
                'user_id' => $request->query('user_id'),
                'subject_type' => $request->query('subject_type'),
                'log_name' => $request->query('log_name'),
                'event' => $request->query('event'),
                'search' => $request->query('search'),
                'date_from' => $request->query('date_from'),
                'date_to' => $request->query('date_to'),
                'ip_address' => $request->query('ip_address'),
            ];

            $perPage = $request->query('per_page', 50);

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
     * @param Request $request
     * @param int $userId
     * @return JsonResponse
     */
    public function getUserAudits(Request $request, int $userId): JsonResponse
    {
        try {
            $perPage = $request->query('per_page', 50);
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
     * @param Request $request
     * @param string $subjectType
     * @param int $subjectId
     * @return JsonResponse
     */
    public function getModelAudits(Request $request, string $subjectType, int $subjectId): JsonResponse
    {
        try {
            $perPage = $request->query('per_page', 50);
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
     * @param Request $request
     * @return JsonResponse
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $filters = [
                'date_from' => $request->query('date_from'),
                'date_to' => $request->query('date_to'),
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
            $subjectTypes = $this->auditService->getAvailableSubjectTypes();
            $logNames = $this->auditService->getAvailableLogNames();
            $users = $this->auditService->getAvailableUsers();

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

