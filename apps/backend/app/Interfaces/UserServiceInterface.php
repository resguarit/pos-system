<?php

namespace App\Interfaces;

use App\Models\User;

interface UserServiceInterface
{
    public function getAllUsers();

    public function getUserById(int $id): ?User;

    public function createUser(array $data): User;

    public function updateUser(int $id, array $data): User;

    public function deleteUser(int $id): bool;

    /**
     * Obtener todas las sucursales y las sucursales asignadas a un usuario
     */
    public function getUserBranches(int $userId): array;

    /**
     * Actualizar las sucursales asignadas a un usuario
     */
    public function updateUserBranches(int $userId, array $branchIds): void;

    public function checkUsernameExists($username): bool;

    public function checkEmailExists($email): bool;

    public function checkNameExists($firstName, $lastName): bool;
}