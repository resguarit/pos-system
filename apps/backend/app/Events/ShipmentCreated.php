<?php

namespace App\Events;

use App\Models\Shipment;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShipmentCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Shipment $shipment;
    public User $user;

    /**
     * Create a new event instance.
     */
    public function __construct(Shipment $shipment, User $user)
    {
        $this->shipment = $shipment;
        $this->user = $user;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('shipments.global'),
            new PrivateChannel('shipments.branch.' . $this->shipment->branch_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'shipment.created';
    }

    public function broadcastWith(): array
    {
        return [
            'shipment' => [
                'id' => $this->shipment->id,
                'reference' => $this->shipment->reference,
                'branch_id' => $this->shipment->branch_id,
                'created_at' => $this->shipment->created_at,
            ],
            'actor' => [
                'id' => $this->user->id,
                'username' => $this->user->username,
            ],
        ];
    }
}