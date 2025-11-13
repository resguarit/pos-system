<?php

namespace App\Interfaces;

use Illuminate\Pagination\LengthAwarePaginator;
use Spatie\Activitylog\Models\Activity;

interface AuditServiceInterface
{
    /**
     * Obtener todas las auditorías con filtros opcionales
     *
     * @param array $filters
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getAudits(array $filters = [], int $perPage = 50): LengthAwarePaginator;

    /**
     * Obtener una auditoría específica por ID
     *
     * @param int $id
     * @return Activity|null
     */
    public function getAuditById(int $id): ?Activity;

    /**
     * Obtener auditorías de un usuario específico
     *
     * @param int $userId
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getUserAudits(int $userId, int $perPage = 50): LengthAwarePaginator;

    /**
     * Obtener auditorías de un modelo específico
     *
     * @param string $subjectType
     * @param int $subjectId
     * @param int $perPage
     * @return LengthAwarePaginator
     */
    public function getModelAudits(string $subjectType, int $subjectId, int $perPage = 50): LengthAwarePaginator;

    /**
     * Obtener estadísticas de auditorías
     *
     * @param array $filters
     * @return array
     */
    public function getStatistics(array $filters = []): array;

    /**
     * Obtener tipos de modelos disponibles para filtros
     *
     * @return array
     */
    public function getAvailableSubjectTypes(): array;

    /**
     * Obtener log names disponibles para filtros
     *
     * @return array
     */
    public function getAvailableLogNames(): array;

    /**
     * Obtener usuarios disponibles para filtros
     *
     * @return array
     */
    public function getAvailableUsers(): array;
}

