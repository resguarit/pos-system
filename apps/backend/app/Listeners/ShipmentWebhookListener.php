<?php

namespace App\Listeners;

use App\Events\ShipmentCreated;
use App\Events\ShipmentFailed;
use App\Events\ShipmentMoved;

class ShipmentWebhookListener
{
    public function handle(ShipmentCreated|ShipmentMoved|ShipmentFailed $event): void
    {
        // Placeholder listener for shipment webhook integrations.
        // Existing mappings expect this listener; keeping it noop is safe
        // until webhook dispatching rules are defined.
    }
}
