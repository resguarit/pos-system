<?php

namespace App\Interfaces;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use App\Models\Repair;

interface RepairServiceInterface
{
    public function list(array $filters = []): LengthAwarePaginator;
    public function listAll(array $filters = []): Collection;
    public function find(int $id): ?Repair;
    public function create(array $data): Repair;
    public function update(int $id, array $data): Repair;
    public function updateStatus(int $id, string $status): Repair;
    public function markNoRepair(int $id, ?string $reason): Repair;
    public function assignTechnician(int $id, int $technicianId): Repair;
    public function addNote(int $id, int $userId, string $note): void;
    public function stats(array $filters = []): array;
}

