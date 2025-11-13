<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Etiqueta de Envío {{ $shipment->reference ?? $shipment->id }}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        .header { border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
        .header-table { width: 100%; }
        .logo-cell { width: 180px; vertical-align: top; padding-right: 20px; }
        .logo { max-width: 120px; max-height: 80px; width: auto; height: auto; object-fit: contain; }
        .company-data { font-size: 10px; }
        .company-name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
        .header-info { vertical-align: top; }
        .info-table, .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .info-table td { padding: 5px 8px; font-size: 14px; }
        .items-table th, .items-table td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 14px; }
        .items-table th { background: #f5f5f5; font-weight: bold; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .mt-2 { margin-top: 10px; }
        .priority { padding: 4px 8px; border-radius: 4px; display: inline-block; font-weight: bold; }
        .priority-urgent { background: #fee; color: #c00; }
        .priority-high { background: #ffe; color: #a60; }
        .priority-normal { background: #efe; color: #060; }
        .priority-low { background: #eef; color: #006; }
    </style>
</head>
<body>
    <div class="header">
        <table class="header-table">
            <tr>
                <td class="logo-cell">
                    @php
                        $logoUrl = public_path('images/logo.jpg');
                        $logoSetting = \App\Models\Setting::where('key', 'logo_url')->first();
                        if ($logoSetting && !empty($logoSetting->value)) {
                            $logoPath = json_decode($logoSetting->value, true);
                            if (is_string($logoPath) && str_starts_with($logoPath, '/storage/')) {
                                $filePath = str_replace('/storage/', '', $logoPath);
                                $storageLogoUrl = storage_path('app/public/' . $filePath);
                                if (file_exists($storageLogoUrl)) {
                                    $logoUrl = $storageLogoUrl;
                                }
                            }
                        }
                    @endphp
                    @if(file_exists($logoUrl))
                    <img src="{{ $logoUrl }}" alt="Logo" class="logo">
                    @endif
                </td>
                <td class="header-info">
                    @php
                        $companyName = \App\Models\Setting::where('key', 'company_name')->first();
                        $companyRuc = \App\Models\Setting::where('key', 'company_ruc')->first();
                        $companyAddress = \App\Models\Setting::where('key', 'company_address')->first();
                        $companyPhone = \App\Models\Setting::where('key', 'company_phone')->first();
                        $companyEmail = \App\Models\Setting::where('key', 'company_email')->first();
                        
                        $name = $companyName ? json_decode($companyName->value, true) : '';
                        $ruc = $companyRuc ? json_decode($companyRuc->value, true) : '';
                        $address = $companyAddress ? json_decode($companyAddress->value, true) : '';
                        $phone = $companyPhone ? json_decode($companyPhone->value, true) : '';
                        $email = $companyEmail ? json_decode($companyEmail->value, true) : '';
                    @endphp
                    <div class="company-data">
                        <div class="company-name">{{ $name ?: $shipment->branch->description ?? '' }}</div>
                        @if($ruc)
                        <div>RUC/CUIT: {{ $ruc }}</div>
                        @endif
                        @if($address)
                        <div>Dirección: {{ $address }}</div>
                        @elseif($shipment->branch && $shipment->branch->address)
                        <div>{{ $shipment->branch->address }}</div>
                        @endif
                        @if($phone)
                        <div>Teléfono: {{ $phone }}</div>
                        @endif
                        @if($email)
                        <div>Email: {{ $email }}</div>
                        @endif
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <h2 style="margin-bottom: 20px;">ETIQUETA DE ENVÍO</h2>

    <table class="info-table">
        <tr>
            <td class="bold">Referencia:</td>
            <td>{{ $shipment->reference ?? 'N/A' }}</td>
            <td class="bold">Estado:</td>
            <td>{{ $shipment->currentStage->name ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td class="bold">Fecha de Creación:</td>
            <td>{{ $shipment->created_at ? \Carbon\Carbon::parse($shipment->created_at)->format('d/m/Y H:i') : 'N/A' }}</td>
            <td class="bold">Prioridad:</td>
            <td>
                @php
                    $priorityClass = 'priority-normal';
                    $priorityLabel = 'Normal';
                    if ($shipment->priority === 'urgent') {
                        $priorityClass = 'priority-urgent';
                        $priorityLabel = 'Urgente';
                    } elseif ($shipment->priority === 'high') {
                        $priorityClass = 'priority-high';
                        $priorityLabel = 'Alta';
                    } elseif ($shipment->priority === 'low') {
                        $priorityClass = 'priority-low';
                        $priorityLabel = 'Baja';
                    }
                @endphp
                <span class="priority {{ $priorityClass }}">{{ $priorityLabel }}</span>
            </td>
        </tr>
        @if($shipment->estimated_delivery_date)
        <tr>
            <td class="bold">Fecha Estimada de Entrega:</td>
            <td>{{ \Carbon\Carbon::parse($shipment->estimated_delivery_date)->format('d/m/Y') }}</td>
            <td></td>
            <td></td>
        </tr>
        @endif
        @if($shipment->branch)
        <tr>
            <td class="bold">Sucursal:</td>
            <td>{{ $shipment->branch->description ?? 'N/A' }}</td>
            <td></td>
            <td></td>
        </tr>
        @endif
        @if($shipment->creator)
        <tr>
            <td class="bold">Creado por:</td>
            <td>{{ $shipment->creator->person ? trim($shipment->creator->person->first_name . ' ' . $shipment->creator->person->last_name) : $shipment->creator->username ?? 'N/A' }}</td>
            <td></td>
            <td></td>
        </tr>
        @endif
    </table>

    @if($shipment->transporter)
    <div class="mt-2 bold">Transportista</div>
    <table class="info-table">
        <tr>
            <td>Nombre:</td>
            <td>{{ $shipment->transporter->person ? trim($shipment->transporter->person->first_name . ' ' . $shipment->transporter->person->last_name) : $shipment->transporter->username ?? 'N/A' }}</td>
        </tr>
        @if($shipment->transporter->email)
        <tr>
            <td>Email:</td>
            <td>{{ $shipment->transporter->email }}</td>
        </tr>
        @endif
    </table>
    @endif

    <div class="mt-2 bold">Dirección de Envío</div>
    <table class="info-table">
        @if($shipment->shipping_address)
        <tr>
            <td>Dirección:</td>
            <td>{{ $shipment->shipping_address }}</td>
        </tr>
        @endif
        @if($shipment->shipping_city)
        <tr>
            <td>Ciudad:</td>
            <td>{{ $shipment->shipping_city }}</td>
        </tr>
        @endif
        @if($shipment->shipping_state)
        <tr>
            <td>Provincia/Estado:</td>
            <td>{{ $shipment->shipping_state }}</td>
        </tr>
        @endif
        @if($shipment->shipping_postal_code)
        <tr>
            <td>Código Postal:</td>
            <td>{{ $shipment->shipping_postal_code }}</td>
        </tr>
        @endif
        @if($shipment->shipping_country)
        <tr>
            <td>País:</td>
            <td>{{ $shipment->shipping_country }}</td>
        </tr>
        @endif
    </table>

    @if($shipment->sales && $shipment->sales->count() > 0)
    <div class="mt-2 bold">Ventas Asociadas</div>
    <table class="items-table">
        <thead>
            <tr>
                <th>Comprobante</th>
                <th>Número</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
        @foreach($shipment->sales as $sale)
            @php
                $customerName = 'N/A';
                if ($sale->customer) {
                    if ($sale->customer->person) {
                        $customerName = trim($sale->customer->person->first_name . ' ' . $sale->customer->person->last_name);
                    } elseif ($sale->customer->business_name) {
                        $customerName = $sale->customer->business_name;
                    }
                }
            @endphp
            <tr>
                <td>{{ $sale->receiptType->name ?? $sale->receiptType->description ?? 'N/A' }}</td>
                <td>{{ $sale->receipt_number ?? $sale->id }}</td>
                <td>{{ $sale->date ? \Carbon\Carbon::parse($sale->date)->format('d/m/Y') : 'N/A' }}</td>
                <td>{{ $customerName }}</td>
                <td class="right">${{ number_format($sale->total ?? 0, 2, ',', '.') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif

    @if($shipment->shipping_cost && $shipment->shipping_cost > 0)
    <table class="info-table" style="margin-top: 20px;">
        <tr>
            <td class="right bold">Costo de Envío:</td>
            <td class="right bold">${{ number_format($shipment->shipping_cost, 2, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="right bold">Estado de Pago:</td>
            <td class="right">{{ $shipment->is_paid ? 'Pagado' : 'Pendiente' }}</td>
        </tr>
        @if($shipment->is_paid && $shipment->payment_date)
        <tr>
            <td class="right bold">Fecha de Pago:</td>
            <td class="right">{{ \Carbon\Carbon::parse($shipment->payment_date)->format('d/m/Y H:i') }}</td>
        </tr>
        @endif
    </table>
    @endif

    @if($shipment->notes)
    <div class="mt-2 bold">Notas</div>
    <div style="border: 1px solid #ddd; padding: 10px; margin-top: 10px; background: #f9f9f9;">
        {{ $shipment->notes }}
    </div>
    @endif

    @if($shipment->events && $shipment->events->count() > 0)
    <div class="mt-2 bold">Historial de Eventos</div>
    <table class="items-table">
        <thead>
            <tr>
                <th>Fecha</th>
                <th>De</th>
                <th>A</th>
                <th>Usuario</th>
            </tr>
        </thead>
        <tbody>
        @foreach($shipment->events->take(10) as $event)
            @php
                $userName = 'Sistema';
                if ($event->user_id) {
                    $user = \App\Models\User::with('person')->find($event->user_id);
                    if ($user) {
                        $userName = $user->person ? trim($user->person->first_name . ' ' . $user->person->last_name) : $user->username ?? 'Usuario';
                    }
                }
                $fromStage = $event->from_stage_id ? \App\Models\ShipmentStage::find($event->from_stage_id) : null;
                $toStage = $event->to_stage_id ? \App\Models\ShipmentStage::find($event->to_stage_id) : null;
            @endphp
            <tr>
                <td>{{ $event->created_at ? \Carbon\Carbon::parse($event->created_at)->format('d/m/Y H:i') : 'N/A' }}</td>
                <td>{{ $fromStage ? $fromStage->name : '-' }}</td>
                <td>{{ $toStage ? $toStage->name : '-' }}</td>
                <td>{{ $userName }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif
</body>
</html>





