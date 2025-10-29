<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante {{ $sale->receipt_number }}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        .header { border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
        .header-table { width: 100%; }
        .logo-cell { width: 180px; vertical-align: top; padding-right: 20px; }
        .logo { max-width: 120px; max-height: 80px; width: auto; height: auto; object-fit: contain; }
        .company-data { font-size: 10px; }
        .company-name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
        .header-info { vertical-align: top; }
        .branch { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .info-table, .items-table, .totals-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .info-table td { padding: 5px 8px; font-size: 14px; }
        .items-table th, .items-table td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 14px; }
        .items-table th { background: #f5f5f5; font-weight: bold; }
        .totals-table td { padding: 5px 8px; font-size: 16px; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .mt-2 { margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <table class="header-table">
            <tr>
                <td class="logo-cell">
                    @php
                        // Usar directamente public/images/logo.jpg como estaba antes
                        $logoUrl = public_path('images/logo.jpg');
                        
                        // Si existe logo_url en settings y apunta a storage, intentar usarlo
                        $logoSetting = \App\Models\Setting::where('key', 'logo_url')->first();
                        if ($logoSetting && !empty($logoSetting->value)) {
                            $logoPath = json_decode($logoSetting->value, true);
                            
                            // Solo si es una ruta de storage, usar storage_path
                            if (is_string($logoPath) && str_starts_with($logoPath, '/storage/')) {
                                $filePath = str_replace('/storage/', '', $logoPath);
                                $storageLogoUrl = storage_path('app/public/' . $filePath);
                                // Solo usar si el archivo existe en storage
                                if (file_exists($storageLogoUrl)) {
                                    $logoUrl = $storageLogoUrl;
                                }
                            }
                            // Si es /images/logo.jpg (ruta relativa), mantener el default
                            // Si es URL completa (http), no podemos usarla en PDF, mantener default
                        }
                    @endphp
                    @if(file_exists($logoUrl))
                    <img src="{{ $logoUrl }}" alt="Logo" class="logo">
                    @endif
                </td>
                <td class="header-info">
                    @php
                        // Obtener datos de la empresa desde configuración
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
                        <div class="company-name">{{ $name ?: $sale->branch->description ?? '' }}</div>
                        @if($ruc)
                        <div>RUC/CUIT: {{ $ruc }}</div>
                        @endif
                        @if($address)
                        <div>Dirección: {{ $address }}</div>
                        @elseif($sale->branch->address)
                        <div>{{ $sale->branch->address }}</div>
                        @endif
                        @if($phone)
                        <div>Teléfono: {{ $phone }}</div>
                        @endif
                        @if($email)
                        <div>Email: {{ $email }}</div>
                        @endif
                        @if(!$name && $sale->branch->iva_condition)
                        <div>{{ $sale->branch->iva_condition }}</div>
                        @endif
                    </div>
                </td>
            </tr>
        </table>
    </div>
    <table class="info-table">
        <tr>
            <td class="bold">Comprobante:</td>
            <td>{{ $sale->receiptType->name ?? $sale->receiptType->description ?? '-' }}</td>
            <td class="bold">N°:</td>
            <td>{{ $sale->receipt_number }}</td>
        </tr>
        <tr>
            <td class="bold">Fecha:</td>
            <td>{{ $sale->date ? \Carbon\Carbon::parse($sale->date)->format('d/m/Y H:i') : '-' }}</td>
            <td></td><td></td>
        </tr>
        {{-- Mostrar CAE solo si existe --}}
        @if(!empty($sale->cae))
        <tr>
            <td class="bold">CAE:</td>
            <td>{{ $sale->cae }}</td>
            <td></td><td></td>
        </tr>
        @endif
        {{-- Mostrar Vto. CAE solo si existe --}}
        @if(!empty($sale->cae_expiration_date))
        <tr>
            <td class="bold">Vto. CAE:</td>
            <td>{{ \Carbon\Carbon::parse($sale->cae_expiration_date)->format('d/m/Y') }}</td>
            <td></td><td></td>
        </tr>
        @endif
    </table>
    @if($sale->customer)
    <div class="mt-2 bold">Cliente</div>
    <table class="info-table">
        <tr>
            <td>Razón Social:</td>
            <td>{{ $sale->customer->business_name ?? (($sale->customer->person->first_name ?? '') . ' ' . ($sale->customer->person->last_name ?? '')) }}</td>
        </tr>
        @if($sale->customer->person->address)
        <tr>
            <td>Dirección:</td>
            <td>{{ $sale->customer->person->address }}</td>
        </tr>
        @endif
        @if($sale->customer->person->phone)
        <tr>
            <td>Teléfono:</td>
            <td>{{ $sale->customer->person->phone }}</td>
        </tr>
        @endif
    </table>
    @endif

    <table class="items-table">
        <thead>
            <tr>
                <th>Descripción</th>
                <th class="right">Cantidad</th>
                <th class="right">Precio de venta unitario</th>
                <th class="right">Desc.</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
        @php
            $totalIvaCalculated = 0;
            $subtotalBeforeDiscount = 0;
        @endphp
        @foreach($sale->items as $item)
            @php
                // Usar sale_price del producto (precio con IVA)
                $salePrice = (float) ($item->product->sale_price ?? 0);
                $quantity = (float) $item->quantity;
                $discountAmount = (float) ($item->discount_amount ?? 0);
                
                // Total del item = (precio de venta × cantidad) - descuento
                $itemTotal = ($salePrice * $quantity) - $discountAmount;
                
                // Para los cálculos de totales, necesitamos el subtotal sin IVA
                $unitPrice = (float) $item->unit_price;
                $itemSubtotal = $unitPrice * $quantity;
                $ivaRate = (float) ($item->iva_rate ?? 0);
                $itemIvaCalculated = $itemSubtotal * ($ivaRate / 100);
                
                $totalIvaCalculated += $itemIvaCalculated;
                $subtotalBeforeDiscount += $itemSubtotal;
            @endphp
            <tr>
                <td>{{ $item->product->description ?? 'Producto' }}</td>
                <td class="right">{{ number_format($quantity, 0, ',', '.') }}</td>
                <td class="right">${{ number_format($salePrice, 2, ',', '.') }}</td>
                <td class="right">${{ number_format($discountAmount, 2, ',', '.') }}</td>
                <td class="right">${{ number_format($itemTotal, 2, ',', '.') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @php
        $totalFinal = (float) $sale->total;
    @endphp
    <table class="totals-table">
        <tr>
            <td class="right bold">Subtotal:</td>
            <td class="right">${{ number_format($subtotalBeforeDiscount, 2, ',', '.') }}</td>
        </tr>
        <tr>
            <td class="right bold">IVA:</td>
            <td class="right">${{ number_format($totalIvaCalculated, 2, ',', '.') }}</td>
        </tr>
        @if($sale->discount_amount > 0)
        <tr>
            <td class="right bold">Descuentos:</td>
            <td class="right">- ${{ number_format($sale->discount_amount, 2, ',', '.') }}</td>
        </tr>
        @endif
        @if($sale->iibb > 0)
        <tr>
            <td class="right bold">IIBB:</td>
            <td class="right">${{ number_format($sale->iibb, 2, ',', '.') }}</td>
        </tr>
        @endif
        @if($sale->internal_tax > 0)
        <tr>
            <td class="right bold">Imp. Internos:</td>
            <td class="right">${{ number_format($sale->internal_tax, 2, ',', '.') }}</td>
        </tr>
        @endif
        <tr>
            <td class="right bold">Total:</td>
            <td class="right bold">${{ number_format($totalFinal, 2, ',', '.') }}</td>
        </tr>
    </table>
</body>
</html>
