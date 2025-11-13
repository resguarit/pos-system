<?php

namespace App\Services;

use App\Interfaces\AuditServiceInterface;
use Spatie\Activitylog\Models\Activity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Carbon\Carbon;

class AuditService implements AuditServiceInterface
{
    /**
     * Obtener todas las auditorías con filtros opcionales
     *
     * @param array $filters
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getAudits(array $filters = [], int $perPage = 50): LengthAwarePaginator
    {
        $query = Activity::with(['causer.person', 'subject'])
            ->orderBy('created_at', 'desc');

        // Filtrar por usuario
        if (isset($filters['user_id']) && $filters['user_id']) {
            $query->where('causer_id', $filters['user_id'])
                  ->where('causer_type', 'App\Models\User');
        }

        // Filtrar por tipo de modelo (subject_type)
        if (isset($filters['subject_type']) && $filters['subject_type']) {
            $query->where('subject_type', $filters['subject_type']);
        }

        // Filtrar por log_name
        if (isset($filters['log_name']) && $filters['log_name']) {
            $query->where('log_name', $filters['log_name']);
        }

        // Filtrar por evento
        if (isset($filters['event']) && $filters['event']) {
            $query->where('event', $filters['event']);
        }

        // Filtrar por descripción (búsqueda)
        if (isset($filters['search']) && $filters['search']) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhereHas('causer.person', function ($q) use ($search) {
                      $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        // Filtrar por fecha desde
        if (isset($filters['date_from']) && $filters['date_from']) {
            $query->whereDate('created_at', '>=', Carbon::parse($filters['date_from'])->startOfDay());
        }

        // Filtrar por fecha hasta
        if (isset($filters['date_to']) && $filters['date_to']) {
            $query->whereDate('created_at', '<=', Carbon::parse($filters['date_to'])->endOfDay());
        }

        // Filtrar por IP
        if (isset($filters['ip_address']) && $filters['ip_address']) {
            $query->whereJsonContains('properties->ip_address', $filters['ip_address']);
        }

        return $query->paginate($perPage);
    }

    /**
     * Obtener una auditoría específica por ID
     *
     * @param int $id
     * @return Activity|null
     */
    public function getAuditById(int $id): ?Activity
    {
        return Activity::with(['causer.person', 'subject'])
            ->find($id);
    }

    /**
     * Obtener auditorías de un usuario específico
     *
     * @param int $userId
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getUserAudits(int $userId, int $perPage = 50): LengthAwarePaginator
    {
        return $this->getAudits(['user_id' => $userId], $perPage);
    }

    /**
     * Obtener auditorías de un modelo específico
     *
     * @param string $subjectType
     * @param int $subjectId
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getModelAudits(string $subjectType, int $subjectId, int $perPage = 50): LengthAwarePaginator
    {
        return Activity::with(['causer.person', 'subject'])
            ->where('subject_type', $subjectType)
            ->where('subject_id', $subjectId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Obtener estadísticas de auditorías
     *
     * @param array $filters
     * @return array
     */
    public function getStatistics(array $filters = []): array
    {
        $query = Activity::query();

        // Aplicar filtros de fecha si existen
        if (isset($filters['date_from']) && $filters['date_from']) {
            $query->whereDate('created_at', '>=', Carbon::parse($filters['date_from'])->startOfDay());
        }

        if (isset($filters['date_to']) && $filters['date_to']) {
            $query->whereDate('created_at', '<=', Carbon::parse($filters['date_to'])->endOfDay());
        }

        $total = $query->count();
        
        // Actividades por tipo de modelo
        $bySubjectType = Activity::selectRaw('subject_type, COUNT(*) as count')
            ->groupBy('subject_type')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->get()
            ->pluck('count', 'subject_type')
            ->toArray();

        // Actividades por log_name
        $byLogName = Activity::selectRaw('log_name, COUNT(*) as count')
            ->groupBy('log_name')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->get()
            ->pluck('count', 'log_name')
            ->toArray();

        // Actividades por evento
        $byEvent = Activity::selectRaw('event, COUNT(*) as count')
            ->whereNotNull('event')
            ->groupBy('event')
            ->orderBy('count', 'desc')
            ->get()
            ->pluck('count', 'event')
            ->toArray();

        // Usuarios más activos
        $topUsers = Activity::selectRaw('causer_id, COUNT(*) as count')
            ->whereNotNull('causer_id')
            ->where('causer_type', 'App\Models\User')
            ->groupBy('causer_id')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->with('causer.person')
            ->get()
            ->map(function ($item) {
                return [
                    'user_id' => $item->causer_id,
                    'user_name' => $item->causer->person->full_name ?? 'N/A',
                    'count' => $item->count,
                ];
            })
            ->toArray();

        return [
            'total' => $total,
            'by_subject_type' => $bySubjectType,
            'by_log_name' => $byLogName,
            'by_event' => $byEvent,
            'top_users' => $topUsers,
        ];
    }

    /**
     * Obtener tipos de modelos disponibles para filtros
     *
     * @return array
     */
    public function getAvailableSubjectTypes(): array
    {
        return Activity::select('subject_type')
            ->distinct()
            ->whereNotNull('subject_type')
            ->orderBy('subject_type')
            ->pluck('subject_type')
            ->toArray();
    }

    /**
     * Obtener log names disponibles para filtros
     *
     * @return array
     */
    public function getAvailableLogNames(): array
    {
        return Activity::select('log_name')
            ->distinct()
            ->whereNotNull('log_name')
            ->orderBy('log_name')
            ->pluck('log_name')
            ->toArray();
    }

    /**
     * Obtener usuarios disponibles para filtros (usuarios que tienen auditorías)
     *
     * @return array
     */
    public function getAvailableUsers(): array
    {
        // Obtener IDs únicos de usuarios que tienen auditorías
        $userIds = Activity::select('causer_id')
            ->distinct()
            ->whereNotNull('causer_id')
            ->where('causer_type', 'App\Models\User')
            ->pluck('causer_id')
            ->toArray();

        if (empty($userIds)) {
            return [];
        }

        // Cargar usuarios con sus personas
        $users = \App\Models\User::with('person')
            ->whereIn('id', $userIds)
            ->get()
            ->map(function ($user) {
                if (!$user->person) {
                    return null;
                }
                return [
                    'id' => $user->id,
                    'name' => $user->person->full_name ?? trim($user->person->first_name . ' ' . $user->person->last_name),
                ];
            })
            ->filter()
            ->sortBy('name')
            ->values()
            ->toArray();

        return $users;
    }
}

