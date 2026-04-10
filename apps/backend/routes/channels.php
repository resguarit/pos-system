<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('shipments.global', function ($user) {
    return $user->hasPermission('ver_envios');
});

Broadcast::channel('shipments.branch.{branchId}', function ($user, int $branchId) {
    if (!$user->hasPermission('ver_envios')) {
        return false;
    }

    return $user->branches()->where('branches.id', $branchId)->exists();
});
