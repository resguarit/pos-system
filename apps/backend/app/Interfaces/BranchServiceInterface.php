<?php

namespace App\Interfaces;

interface BranchServiceInterface
{
    public function getAllBranches();
    public function getBranchById($id);
    public function createBranch(array $data);
    public function updateBranch($id, array $data);
    public function deleteBranch($id);
    public function getActiveBranches();
    public function checkNameExists($name): bool;
} 