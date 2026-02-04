<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\ScheduleService;
use Illuminate\Support\Facades\Auth;

class CheckAccessSchedule
{
    protected ScheduleService $scheduleService;

    public function __construct(ScheduleService $scheduleService)
    {
        $this->scheduleService = $scheduleService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Si no hay usuario autenticado, dejar pasar (auth middleware se encargará) o bloquear
        // En este caso, asumimos que este middleware corre DESPUÉS de auth:sanctum
        if (!$user) {
            return $next($request);
        }

        // Cargar el rol si no está cargado
        if (!$user->relationLoaded('role')) {
            $user->load('role');
        }

        // Verificar el horario usando el servicio
        if (!$this->scheduleService->isAccessAllowed($user)) {
            $scheduleMessage = $this->scheduleService->getScheduleMessage($user);

            // Opcional: Registrar logout forzado en activity log
            // (Ya se hace en AuthController, pero aquí es un rechazo de request)

            // Revocar el token actual para forzar el cierre de sesión real
            if ($request->user() && $request->user()->currentAccessToken()) {
                $request->user()->currentAccessToken()->delete();
            }

            return response()->json([
                'message' => 'Acceso no permitido en este horario. Tu turno ha finalizado.',
                'schedule' => $scheduleMessage,
                'error_code' => 'SCHEDULE_RESTRICTED'
            ], 403);
        }

        return $next($request);
    }
}
