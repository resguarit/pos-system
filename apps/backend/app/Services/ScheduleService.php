<?php

namespace App\Services;

use Carbon\Carbon;
use App\Models\User;

class ScheduleService
{
    /**
     * Zona horaria por defecto para Argentina
     */
    protected string $defaultTimezone = 'America/Argentina/Buenos_Aires';

    /**
     * Nombres de días de la semana en español
     */
    protected array $dayNames = [
        1 => 'Lunes',
        2 => 'Martes',
        3 => 'Miércoles',
        4 => 'Jueves',
        5 => 'Viernes',
        6 => 'Sábado',
        7 => 'Domingo',
    ];

    /**
     * Verifica si un usuario puede acceder en el horario actual
     * 
     * @param User $user
     * @return bool
     */
    public function isAccessAllowed(User $user): bool
    {
        // Los administradores siempre tienen acceso
        if ($this->isAdmin($user)) {
            return true;
        }

        // Si el usuario no tiene rol o el rol no tiene restricción de horario
        if (!$user->role || !$user->role->access_schedule) {
            return true;
        }

        $schedule = $user->role->access_schedule;

        // Si la restricción no está habilitada
        if (!isset($schedule['enabled']) || !$schedule['enabled']) {
            return true;
        }

        return $this->isWithinSchedule($schedule);
    }

    /**
     * Verifica si el momento actual está dentro del horario configurado
     * 
     * @param array $schedule
     * @return bool
     */
    protected function isWithinSchedule(array $schedule): bool
    {
        $timezone = $schedule['timezone'] ?? $this->defaultTimezone;
        $now = Carbon::now($timezone);

        // Verificar día de la semana (1=Lunes, 7=Domingo)
        $currentDay = $now->dayOfWeekIso;
        $allowedDays = $schedule['days'] ?? [];

        if (!in_array($currentDay, $allowedDays)) {
            return false;
        }

        // Verificar horario
        $startTime = $schedule['start_time'] ?? null;
        $endTime = $schedule['end_time'] ?? null;

        if (!$startTime || !$endTime) {
            return true; // Si no hay horario definido, permitir acceso
        }

        $currentTime = $now->format('H:i');

        return $currentTime >= $startTime && $currentTime <= $endTime;
    }

    /**
     * Genera un mensaje legible sobre el horario permitido
     * 
     * @param User $user
     * @return string|null
     */
    public function getScheduleMessage(User $user): ?string
    {
        if (!$user->role || !$user->role->access_schedule) {
            return null;
        }

        $schedule = $user->role->access_schedule;

        if (!isset($schedule['enabled']) || !$schedule['enabled']) {
            return null;
        }

        $days = $schedule['days'] ?? [];
        $startTime = $schedule['start_time'] ?? '00:00';
        $endTime = $schedule['end_time'] ?? '23:59';

        // Formatear días
        $dayLabels = array_map(fn($d) => $this->dayNames[$d] ?? '', $days);
        $daysText = $this->formatDaysRange($dayLabels);

        return "Horario permitido: {$daysText} de {$startTime} a {$endTime} hs";
    }

    /**
     * Formatea los días de manera legible (ej: "Lunes a Viernes")
     * 
     * @param array $dayLabels
     * @return string
     */
    protected function formatDaysRange(array $dayLabels): string
    {
        if (empty($dayLabels)) {
            return 'Sin días configurados';
        }

        if (count($dayLabels) === 1) {
            return $dayLabels[0];
        }

        // Si son días consecutivos, mostrar como rango
        $first = reset($dayLabels);
        $last = end($dayLabels);

        if (
            count($dayLabels) === 5 &&
            $dayLabels === ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
        ) {
            return 'Lunes a Viernes';
        }

        if (
            count($dayLabels) === 6 &&
            $dayLabels === ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        ) {
            return 'Lunes a Sábado';
        }

        if (count($dayLabels) === 7) {
            return 'Todos los días';
        }

        return implode(', ', $dayLabels);
    }

    /**
     * Verifica si un usuario es administrador
     * 
     * @param User $user
     * @return bool
     */
    protected function isAdmin(User $user): bool
    {
        if (!$user->role) {
            return false;
        }

        $roleName = strtolower($user->role->name);
        return in_array($roleName, ['admin', 'administrador']);
    }

    /**
     * Valida la estructura de un schedule
     * 
     * @param array|null $schedule
     * @return array Errores de validación
     */
    public function validateSchedule(?array $schedule): array
    {
        $errors = [];

        if (!$schedule) {
            return $errors;
        }

        if (isset($schedule['enabled']) && $schedule['enabled']) {
            // Validar días
            if (!isset($schedule['days']) || !is_array($schedule['days']) || empty($schedule['days'])) {
                $errors['days'] = 'Debe seleccionar al menos un día';
            } else {
                foreach ($schedule['days'] as $day) {
                    if (!is_int($day) || $day < 1 || $day > 7) {
                        $errors['days'] = 'Los días deben ser valores entre 1 (Lunes) y 7 (Domingo)';
                        break;
                    }
                }
            }

            // Validar horarios
            if (!isset($schedule['start_time']) || !preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $schedule['start_time'])) {
                $errors['start_time'] = 'Formato de hora de inicio inválido (use HH:MM)';
            }

            if (!isset($schedule['end_time']) || !preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $schedule['end_time'])) {
                $errors['end_time'] = 'Formato de hora de fin inválido (use HH:MM)';
            }

            // Validar que hora inicio < hora fin
            if (empty($errors) && $schedule['start_time'] >= $schedule['end_time']) {
                $errors['time_range'] = 'La hora de inicio debe ser anterior a la hora de fin';
            }
        }

        return $errors;
    }
}
