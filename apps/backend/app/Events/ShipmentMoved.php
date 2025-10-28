<?php

namespace App\Events;

use App\Models\Shipment;
use App\Models\ShipmentStage;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShipmentMoved
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Shipment $shipment;
    public ?ShipmentStage $fromStage;
    public ShipmentStage $toStage;
    public User $user;

    /**
     * Create a new event instance.
     */
    public function __construct(Shipment $shipment, ?ShipmentStage $fromStage, ShipmentStage $toStage, User $user)
    {
        $this->shipment = $shipment;
        $this->fromStage = $fromStage;
        $this->toStage = $toStage;
        $this->user = $user;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('shipments'),
        ];
    }
}