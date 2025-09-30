<?php

namespace App\Interfaces;

interface PermissionServiceInterface
{
    public function getAllPermissions();
    public function getPermissionsByRoleId($roleId);
    public function setPermissionsForRole($roleId, array $permissionIds);
    public function countPermissionsByRole();
}
