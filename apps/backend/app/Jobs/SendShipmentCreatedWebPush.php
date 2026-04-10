<?php

namespace App\Jobs;

use App\Models\PushSubscription;
use App\Models\Shipment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class SendShipmentCreatedWebPush implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Avoid duplicate pushes when the event/job is dispatched twice.
     * Requires a cache driver that supports atomic locks (database cache does).
     */
    public int $uniqueFor = 60;

    public function __construct(public int $shipmentId)
    {
    }

    public function uniqueId(): string
    {
        return (string) $this->shipmentId;
    }

    public function handle(): void
    {
        $publicKey = config('services.webpush.public_key');
        $privateKey = config('services.webpush.private_key');
        $subject = config('services.webpush.subject');

        if (!$publicKey || !$privateKey || !$subject) {
            Log::warning('Web Push disabled: missing VAPID config.');
            return;
        }

        $shipment = Shipment::query()->find($this->shipmentId);
        if (!$shipment) {
            return;
        }

        $subscriptions = PushSubscription::query()
            ->where(function ($query) use ($shipment) {
                $query->whereNull('branch_id')
                    ->orWhere('branch_id', $shipment->branch_id);
            })
            // Prefer branch-specific subscriptions over global ones
            ->orderByRaw('branch_id IS NULL asc')
            ->orderByDesc('last_used_at')
            ->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        // De-dupe per device: it's common to have both a global subscription (branch_id NULL)
        // and a branch-specific one for the same device, which would cause duplicate pushes.
        $uniqueSubscriptions = [];
        foreach ($subscriptions as $subscription) {
            $deviceKey = $subscription->public_key . '|' . $subscription->auth_token;
            if (!array_key_exists($deviceKey, $uniqueSubscriptions)) {
                $uniqueSubscriptions[$deviceKey] = $subscription;
            }
        }

        $payload = json_encode([
            'type' => 'shipment.created',
            'title' => 'Nuevo envio',
            'body' => 'Se creo el envio ' . ($shipment->reference ?: ('#' . $shipment->id)),
            'url' => '/dashboard/envios',
            'shipment' => [
                'id' => $shipment->id,
                'reference' => $shipment->reference,
                'branch_id' => $shipment->branch_id,
            ],
            'timestamp' => now()->toIso8601String(),
        ]);

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);

        foreach (array_values($uniqueSubscriptions) as $subscription) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->public_key,
                    'authToken' => $subscription->auth_token,
                    'contentEncoding' => $subscription->content_encoding ?: 'aes128gcm',
                ]),
                $payload
            );
        }

        foreach ($webPush->flush() as $report) {
            $endpoint = $report->getRequest()->getUri()->__toString();
            $endpointHash = hash('sha256', $endpoint);

            if ($report->isSuccess()) {
                PushSubscription::query()
                    ->where('endpoint_hash', $endpointHash)
                    ->update(['last_used_at' => now()]);
                continue;
            }

            $statusCode = $report->getResponse()?->getStatusCode();
            if (in_array($statusCode, [404, 410], true)) {
                PushSubscription::query()->where('endpoint_hash', $endpointHash)->delete();
            }

            Log::warning('Web Push send failed', [
                'status_code' => $statusCode,
                'reason' => $report->getReason(),
            ]);
        }
    }
}
