<?php

namespace App\Events;

use App\Models\Shipment;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShipmentFailed
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Shipment $shipment;
    public User $user;
    public array $payload;

    /**
     * Create a new event instance.
     */
    public function __construct(Shipment $shipment, User $user, array $payload = [])
    {
        $this->shipment = $shipment;
        $this->user = $user;
        $this->payload = $payload;
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