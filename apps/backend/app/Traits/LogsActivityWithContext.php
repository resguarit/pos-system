<?php

namespace App\Traits;

use Spatie\Activitylog\Models\Activity;

trait LogsActivityWithContext
{
    /**
     * Agregar información de contexto (IP, User Agent, URL, método HTTP) a las actividades
     */
    public function tapActivity(Activity $activity, string $eventName): void
    {
        if (app()->runningInConsole()) {
            // Si se ejecuta en consola, no hay request, se puede asignar un valor por defecto o null
            $currentProperties = $activity->properties ? $activity->properties->toArray() : [];
            $activity->properties = array_merge($currentProperties, [
                'ip_address' => 'CLI',
                'user_agent' => 'Console',
                'url' => 'N/A',
                'method' => 'CLI',
            ]);
            return;
        }

        $request = request();
        
        if (!$request) {
            return;
        }

        // Obtener las propiedades actuales como array
        $currentProperties = $activity->properties ? $activity->properties->toArray() : [];
        
        // Agregar información de contexto
        $context = [
            'ip_address' => $request->ip() ?? null,
            'user_agent' => $request->userAgent() ?? null,
            'url' => $request->fullUrl() ?? null,
            'method' => $request->method() ?? null,
        ];
        
        // Merge con las propiedades existentes
        $activity->properties = array_merge($currentProperties, $context);
    }
}

