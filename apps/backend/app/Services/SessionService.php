<?php

namespace App\Services;

use App\Models\User;

/**
 * Servicio para manejar restricciones de sesión
 * Aplica Single Responsibility Principle - separado de ScheduleService
 */
class SessionService
{
    /**
     * Resultado de verificación de sesión
     */
    public const SESSION_ALLOWED = 'allowed';
    public const SESSION_CONFLICT = 'conflict';

    /**
     * Verifica si un usuario puede iniciar sesión según restricciones de sesión única
     * 
     * @param User $user Usuario que intenta iniciar sesión
     * @param bool $forceLogout Si es true, forzar cierre de sesiones anteriores
     * @return array ['status' => string, 'active_sessions' => int]
     */
    public function checkSessionAccess(User $user, bool $forceLogout = false): array
    {
        // Si el rol no tiene restricción de sesión única, permitir
        if (!$this->hasSingleSessionRestriction($user)) {
            return [
                'status' => self::SESSION_ALLOWED,
                'active_sessions' => 0
            ];
        }

        $existingTokensCount = $user->tokens()->count();

        // Si hay sesiones activas y no se forzó el cierre
        if ($existingTokensCount > 0 && !$forceLogout) {
            return [
                'status' => self::SESSION_CONFLICT,
                'active_sessions' => $existingTokensCount
            ];
        }

        // Si se forzó el cierre, eliminar tokens anteriores
        if ($forceLogout && $existingTokensCount > 0) {
            $this->revokeAllSessions($user);
        }

        return [
            'status' => self::SESSION_ALLOWED,
            'active_sessions' => 0
        ];
    }

    /**
     * Verifica si el usuario tiene restricción de sesión única
     * 
     * @param User $user
     * @return bool
     */
    public function hasSingleSessionRestriction(User $user): bool
    {
        return $user->role && $user->role->single_session_only;
    }

    /**
     * Revoca todas las sesiones activas del usuario
     * 
     * @param User $user
     * @return int Cantidad de tokens eliminados
     */
    public function revokeAllSessions(User $user): int
    {
        return $user->tokens()->delete();
    }

    /**
     * Cuenta las sesiones activas del usuario
     * 
     * @param User $user
     * @return int
     */
    public function countActiveSessions(User $user): int
    {
        return $user->tokens()->count();
    }
}
