<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Route;

class CheckNotificationsSetup extends Command
{
    protected $signature = 'notifications:check';

    protected $description = 'Validate notifications setup (broadcast, web push, queue)';

    public function handle(): int
    {
        $this->info('Checking notifications setup...');

        $broadcastConnection = (string) env('BROADCAST_CONNECTION', '');
        $checks = [
            'BROADCAST_CONNECTION' => $broadcastConnection,
            'VAPID_PUBLIC_KEY' => env('VAPID_PUBLIC_KEY'),
            'VAPID_PRIVATE_KEY' => env('VAPID_PRIVATE_KEY'),
            'VAPID_SUBJECT' => env('VAPID_SUBJECT'),
            'QUEUE_CONNECTION' => env('QUEUE_CONNECTION'),
        ];

        if ($broadcastConnection === 'reverb') {
            $checks = array_merge($checks, [
                'REVERB_APP_ID' => env('REVERB_APP_ID'),
                'REVERB_APP_KEY' => env('REVERB_APP_KEY'),
                'REVERB_APP_SECRET' => env('REVERB_APP_SECRET'),
                'REVERB_HOST' => env('REVERB_HOST'),
                'REVERB_PORT' => env('REVERB_PORT'),
                'REVERB_SCHEME' => env('REVERB_SCHEME'),
            ]);
        } elseif ($broadcastConnection === 'pusher') {
            $checks = array_merge($checks, [
                'PUSHER_APP_ID' => env('PUSHER_APP_ID'),
                'PUSHER_APP_KEY' => env('PUSHER_APP_KEY'),
                'PUSHER_APP_SECRET' => env('PUSHER_APP_SECRET'),
                'PUSHER_APP_CLUSTER' => env('PUSHER_APP_CLUSTER'),
            ]);
        }

        $hasErrors = false;
        foreach ($checks as $key => $value) {
            if (empty($value)) {
                $this->error("Missing: {$key}");
                $hasErrors = true;
            } else {
                $this->line("OK: {$key}");
            }
        }

        $routes = collect(Route::getRoutes())->map(fn ($route) => $route->uri());
        $requiredRoutes = [
            'broadcasting/auth',
            'api/push-subscriptions',
        ];

        foreach ($requiredRoutes as $route) {
            if ($routes->contains($route)) {
                $this->line("OK route: {$route}");
            } else {
                $this->error("Missing route: {$route}");
                $hasErrors = true;
            }
        }

        if ($hasErrors) {
            $this->newLine();
            $this->warn('Notifications setup has missing requirements.');
            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Notifications setup is ready.');
        return self::SUCCESS;
    }
}
