<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Servicio dedicado para manejar búsquedas complejas
 * Sigue el principio de Single Responsibility
 */
class SearchService
{
    /**
     * Aplicar búsqueda de texto en campos relacionados
     * 
     * @param Builder $query
     * @param string $searchTerm
     * @param array $searchFields Array de campos para buscar
     * @param string $relation Nombre de la relación
     * @return Builder
     */
    public function applyTextSearch(
        Builder $query, 
        string $searchTerm, 
        array $searchFields, 
        string $relation = null
    ): Builder {
        if (empty($searchTerm) || empty($searchFields)) {
            return $query;
        }

        $searchTerm = trim($searchTerm);
        
        if ($relation) {
            return $query->whereHas($relation, function ($q) use ($searchTerm, $searchFields) {
                $this->buildSearchConditions($q, $searchTerm, $searchFields);
            });
        }

        return $this->buildSearchConditions($query, $searchTerm, $searchFields);
    }

    /**
     * Construir las condiciones de búsqueda
     * 
     * @param Builder $query
     * @param string $searchTerm
     * @param array $searchFields
     * @return Builder
     */
    private function buildSearchConditions(Builder $query, string $searchTerm, array $searchFields): Builder
    {
        $query->where(function ($q) use ($searchTerm, $searchFields) {
            // Búsqueda individual en cada campo
            foreach ($searchFields as $field) {
                $q->orWhere($field, 'like', "%{$searchTerm}%");
            }
            
            // Búsqueda en nombre completo concatenado (si hay múltiples campos)
            if (count($searchFields) >= 2) {
                $concatenatedFields = implode(", ' ', ", $searchFields);
                $q->orWhereRaw("CONCAT({$concatenatedFields}) LIKE ?", ["%{$searchTerm}%"]);
            }
        });

        return $query;
    }

    /**
     * Aplicar filtros de rango numérico
     * 
     * @param Builder $query
     * @param array $filters
     * @param array $rangeFields Campos que soportan filtros de rango
     * @return Builder
     */
    public function applyRangeFilters(Builder $query, array $filters, array $rangeFields): Builder
    {
        foreach ($rangeFields as $field) {
            $minKey = "min_{$field}";
            $maxKey = "max_{$field}";
            
            if (isset($filters[$minKey]) && is_numeric($filters[$minKey])) {
                $query->where($field, '>=', $filters[$minKey]);
            }
            
            if (isset($filters[$maxKey]) && is_numeric($filters[$maxKey])) {
                $query->where($field, '<=', $filters[$maxKey]);
            }
        }

        return $query;
    }

    /**
     * Aplicar filtros de estado
     * 
     * @param Builder $query
     * @param array $filters
     * @param array $statusFields Campos de estado
     * @return Builder
     */
    public function applyStatusFilters(Builder $query, array $filters, array $statusFields): Builder
    {
        foreach ($statusFields as $field) {
            if (isset($filters[$field]) && !empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        return $query;
    }
}
