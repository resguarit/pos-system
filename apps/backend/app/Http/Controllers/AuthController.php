<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Services\ScheduleService;

class AuthController extends Controller
{
    protected ScheduleService $scheduleService;

    public function __construct(ScheduleService $scheduleService)
    {
        $this->scheduleService = $scheduleService;
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de entrada inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        $credentials = $request->only('email', 'password');

        if (Auth::attempt($credentials)) {
            $user = Auth::user();

            // Verificar si el usuario está activo
            if (!$user->active) {
                Auth::logout();
                return response()->json([
                    'message' => 'Tu cuenta está desactivada. Contacta al administrador.'
                ], 403);
            }

            // Cargar rol para verificar horario de acceso
            $user->load('role');

            // Verificar restricción de horario de acceso
            if (!$this->scheduleService->isAccessAllowed($user)) {
                $scheduleMessage = $this->scheduleService->getScheduleMessage($user);
                Auth::logout();
                return response()->json([
                    'message' => 'Acceso no permitido en este horario',
                    'schedule' => $scheduleMessage,
                    'error_code' => 'SCHEDULE_RESTRICTED'
                ], 403);
            }

            $user->load(['branches', 'role.permissions', 'person']);

            // Verificar restricción de sesión única
            if ($user->role && $user->role->single_session_only) {
                $existingTokensCount = $user->tokens()->count();
                $forceLogout = $request->boolean('force_logout', false);

                // Si hay sesiones activas y no se forzó el cierre, pedir confirmación
                if ($existingTokensCount > 0 && !$forceLogout) {
                    Auth::logout();
                    return response()->json([
                        'message' => 'Ya existe una sesión activa en otro dispositivo',
                        'error_code' => 'SESSION_CONFLICT',
                        'active_sessions' => $existingTokensCount
                    ], 409); // 409 Conflict
                }

                // Si se forzó el cierre, eliminar tokens anteriores
                if ($forceLogout) {
                    $user->tokens()->delete();
                }
            }

            // Actualizar last_login_at
            $user->update(['last_login_at' => now()]);

            // Registrar auditoría de login
            User::logLogin($user);

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Login exitoso',
                'user' => $user,
                'token' => $token
            ]);
        }

        return response()->json([
            'message' => 'Credenciales incorrectas'
        ], 401);
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Datos de entrada inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Usuario registrado exitosamente',
            'user' => $user,
            'token' => $token
        ], 201);
    }

    public function logout(Request $request)
    {
        // Eliminar el token actual del usuario
        $request->user()->currentAccessToken()->delete();

        // Registrar auditoría de logout
        if ($request->user()) {
            activity('logout')
                ->causedBy($request->user())
                ->performedOn($request->user())
                ->log('logout');
        }

        return response()->json([
            'message' => 'Logout exitoso'
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load(['branches', 'role.permissions', 'person']);
        return response()->json($user);
    }
}
