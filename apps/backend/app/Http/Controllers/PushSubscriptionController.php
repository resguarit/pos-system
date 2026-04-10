<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class PushSubscriptionController extends Controller
{
    public function index(): JsonResponse
    {
        $subscriptions = PushSubscription::query()
            ->where('user_id', Auth::id())
            ->get(['id', 'branch_id', 'endpoint', 'content_encoding', 'last_used_at', 'created_at']);

        return response()->json([
            'success' => true,
            'data' => $subscriptions,
            'vapid_public_key' => config('services.webpush.public_key'),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|string|max:2048',
            'keys' => 'required|array',
            'keys.p256dh' => 'required|string|max:2048',
            'keys.auth' => 'required|string|max:2048',
            'contentEncoding' => 'nullable|string|max:32',
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        $user = Auth::user();

        if (!empty($validated['branch_id'])) {
            $hasBranch = $user->branches()->where('branches.id', $validated['branch_id'])->exists();
            if (!$hasBranch) {
                return response()->json([
                    'success' => false,
                    'error' => ['code' => 'BRANCH_FORBIDDEN', 'message' => 'No tienes acceso a la sucursal seleccionada.'],
                ], 403);
            }
        }

        $endpointHash = hash('sha256', $validated['endpoint']);

        // De-dupe: browsers can rotate endpoints over time or after re-subscribing.
        // If we keep old endpoints for the same device (same keys), users may receive duplicates.
        PushSubscription::query()
            ->where('user_id', $user->id)
            ->where('public_key', $validated['keys']['p256dh'])
            ->where('auth_token', $validated['keys']['auth'])
            ->where('endpoint_hash', '!=', $endpointHash)
            ->delete();

        $subscription = PushSubscription::query()->updateOrCreate(
            [
                'endpoint_hash' => $endpointHash,
            ],
            [
                'user_id' => $user->id,
                'branch_id' => $validated['branch_id'] ?? null,
                'endpoint' => $validated['endpoint'],
                'public_key' => $validated['keys']['p256dh'],
                'auth_token' => $validated['keys']['auth'],
                'content_encoding' => $validated['contentEncoding'] ?? 'aes128gcm',
                'user_agent' => Str::limit((string) $request->userAgent(), 512, ''),
                'last_used_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'data' => $subscription,
        ], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|string|max:2048',
        ]);

        $deleted = PushSubscription::query()
            ->where('user_id', Auth::id())
            ->where('endpoint_hash', hash('sha256', $validated['endpoint']))
            ->delete();

        return response()->json([
            'success' => true,
            'deleted' => $deleted > 0,
        ]);
    }
}
