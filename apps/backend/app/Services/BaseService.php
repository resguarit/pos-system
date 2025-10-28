<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

abstract class BaseService
{
    /**
     * The model instance.
     */
    protected Model $model;

    /**
     * Constructor.
     */
    public function __construct(Model $model)
    {
        $this->model = $model;
    }

    /**
     * Get all records with optional filtering.
     */
    public function getAll(Request $request): LengthAwarePaginator|Collection
    {
        $query = $this->model->newQuery();

        // Apply common filters
        $this->applyCommonFilters($query, $request);

        // Apply specific filters
        $this->applySpecificFilters($query, $request);

        // Apply search
        $this->applySearch($query, $request);

        // Apply sorting
        $this->applySorting($query, $request);

        // Handle pagination
        if ($request->input('paginate', 'true') === 'false') {
            return $query->get();
        }

        $perPage = $request->input('per_page', 15);
        return $query->paginate($perPage);
    }

    /**
     * Get record by ID.
     */
    public function getById(int $id): ?Model
    {
        return $this->model->find($id);
    }

    /**
     * Create a new record.
     */
    public function create(array $data): Model
    {
        return DB::transaction(function () use ($data) {
            // Prepare data
            $data = $this->prepareDataForCreation($data);

            // Create record
            $record = $this->model->create($data);

            // Handle post-creation logic
            $this->handlePostCreation($record, $data);

            return $record;
        });
    }

    /**
     * Update an existing record.
     */
    public function update(int $id, array $data): ?Model
    {
        $record = $this->model->find($id);
        if (!$record) {
            return null;
        }

        return DB::transaction(function () use ($record, $data) {
            // Prepare data
            $data = $this->prepareDataForUpdate($data);

            // Update record
            $record->update($data);

            // Handle post-update logic
            $this->handlePostUpdate($record, $data);

            return $record;
        });
    }

    /**
     * Delete a record (soft delete if supported).
     */
    public function delete(int $id): bool
    {
        $record = $this->model->find($id);
        if (!$record) {
            return false;
        }

        return DB::transaction(function () use ($record) {
            // Handle pre-deletion logic
            $this->handlePreDeletion($record);

            // Delete record
            if (method_exists($record, 'delete')) {
                $record->delete();
            } else {
                $record->forceDelete();
            }

            // Handle post-deletion logic
            $this->handlePostDeletion($record);

            return true;
        });
    }

    /**
     * Apply common filters to the query.
     */
    protected function applyCommonFilters($query, Request $request): void
    {
        // Filter by date range
        if ($request->has('from_date') && $request->input('from_date')) {
            $query->whereDate('created_at', '>=', $request->input('from_date'));
        }

        if ($request->has('to_date') && $request->input('to_date')) {
            $query->whereDate('created_at', '<=', $request->input('to_date'));
        }

        // Filter by branch if model has branch_id
        if ($request->has('branch_id') && $request->input('branch_id') && $this->model->getFillable() && in_array('branch_id', $this->model->getFillable())) {
            $branchIds = $request->input('branch_id');
            if (is_array($branchIds)) {
                if (count($branchIds) > 0) {
                    $query->whereIn('branch_id', $branchIds);
                }
            } else {
                $query->where('branch_id', $branchIds);
            }
        }

        // Filter by active status if model has is_active
        if ($request->has('is_active') && $request->input('is_active') !== null && $this->model->getFillable() && in_array('is_active', $this->model->getFillable())) {
            $query->where('is_active', $request->input('is_active'));
        }
    }

    /**
     * Apply specific filters to the query.
     * Override this method in child classes for specific filtering logic.
     */
    protected function applySpecificFilters($query, Request $request): void
    {
        // Override in child classes
    }

    /**
     * Apply search to the query.
     * Override this method in child classes for specific search logic.
     */
    protected function applySearch($query, Request $request): void
    {
        if ($request->has('search') && $request->input('search')) {
            $searchTerm = $request->input('search');
            $this->applySearchTerm($query, $searchTerm);
        }
    }

    /**
     * Apply a search term to the query.
     * Override this method in child classes for specific search logic.
     */
    protected function applySearchTerm($query, string $searchTerm): void
    {
        // Override in child classes
    }

    /**
     * Apply sorting to the query.
     */
    protected function applySorting($query, Request $request): void
    {
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        // Validate sort order
        if (!in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        $query->orderBy($sortBy, $sortOrder);
    }

    /**
     * Prepare data for creation.
     * Override this method in child classes for specific data preparation.
     */
    protected function prepareDataForCreation(array $data): array
    {
        // Set created_by if not provided and user is authenticated
        if (!isset($data['created_by']) && Auth::check()) {
            $data['created_by'] = Auth::id();
        }

        return $data;
    }

    /**
     * Prepare data for update.
     * Override this method in child classes for specific data preparation.
     */
    protected function prepareDataForUpdate(array $data): array
    {
        return $data;
    }

    /**
     * Handle post-creation logic.
     * Override this method in child classes for specific post-creation logic.
     */
    protected function handlePostCreation(Model $record, array $data): void
    {
        // Override in child classes
    }

    /**
     * Handle post-update logic.
     * Override this method in child classes for specific post-update logic.
     */
    protected function handlePostUpdate(Model $record, array $data): void
    {
        // Override in child classes
    }

    /**
     * Handle pre-deletion logic.
     * Override this method in child classes for specific pre-deletion logic.
     */
    protected function handlePreDeletion(Model $record): void
    {
        // Override in child classes
    }

    /**
     * Handle post-deletion logic.
     * Override this method in child classes for specific post-deletion logic.
     */
    protected function handlePostDeletion(Model $record): void
    {
        // Override in child classes
    }

    /**
     * Get the model instance.
     */
    protected function getModel(): Model
    {
        return $this->model;
    }

    /**
     * Set the model instance.
     */
    protected function setModel(Model $model): void
    {
        $this->model = $model;
    }

    /**
     * Get the model class name.
     */
    protected function getModelClass(): string
    {
        return get_class($this->model);
    }

    /**
     * Get the model table name.
     */
    protected function getModelTable(): string
    {
        return $this->model->getTable();
    }

    /**
     * Get the model primary key.
     */
    protected function getModelPrimaryKey(): string
    {
        return $this->model->getKeyName();
    }

    /**
     * Get the model fillable attributes.
     */
    protected function getModelFillable(): array
    {
        return $this->model->getFillable();
    }

    /**
     * Get the model guarded attributes.
     */
    protected function getModelGuarded(): array
    {
        return $this->model->getGuarded();
    }

    /**
     * Get the model casts.
     */
    protected function getModelCasts(): array
    {
        return $this->model->getCasts();
    }

    /**
     * Get the model attributes.
     */
    protected function getModelAttributes(): array
    {
        return $this->model->getAttributes();
    }

    /**
     * Get the model relationships.
     */
    protected function getModelRelationships(): array
    {
        return $this->model->getRelations();
    }

    /**
     * Get the model timestamps.
     */
    protected function getModelTimestamps(): bool
    {
        return $this->model->usesTimestamps();
    }

    /**
     * Get the model soft deletes.
     */
    protected function getModelSoftDeletes(): bool
    {
        return method_exists($this->model, 'getDeletedAtColumn');
    }
}



