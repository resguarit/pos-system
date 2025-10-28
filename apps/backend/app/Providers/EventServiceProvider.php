<?php

namespace App\Providers;

use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;
use App\Events\CashMovementCreated;
use App\Listeners\UpdateCashRegisterCalculatedFields;
use App\Events\ShipmentCreated;
use App\Events\ShipmentMoved;
use App\Events\ShipmentFailed;
use App\Listeners\ShipmentEventListener;
use App\Listeners\ShipmentWebhookListener;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],
        CashMovementCreated::class => [
            UpdateCashRegisterCalculatedFields::class,
        ],
        ShipmentCreated::class => [
            ShipmentEventListener::class,
            ShipmentWebhookListener::class,
        ],
        ShipmentMoved::class => [
            ShipmentEventListener::class,
            ShipmentWebhookListener::class,
        ],
        ShipmentFailed::class => [
            ShipmentEventListener::class,
            ShipmentWebhookListener::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
} 