<?php

namespace App\Listeners;

use App\Events\ShipmentCreated;
use App\Events\ShipmentFailed;
use App\Events\ShipmentMoved;
use App\Jobs\SendShipmentCreatedWebPush;

class ShipmentEventListener
{

    public function handle(ShipmentCreated|ShipmentMoved|ShipmentFailed $event): void
    {
        if ($event instanceof ShipmentCreated) {
            SendShipmentCreatedWebPush::dispatch($event->shipment->id);
        }
    }
}
