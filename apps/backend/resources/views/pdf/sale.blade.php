<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante {{ $sale->receipt_number }}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; }
        .header { border-bottom: 1px solid #333; margin-bottom: 10px; }
        .header-table { width: 100%; }
        .logo-cell { width: 180px; vertical-align: top; padding-right: 20px; }
        .logo { max-width: 160px; max-height: 160px; width: auto; height: auto; }
        .header-info { vertical-align: top; }
        .branch { font-size: 16px; font-weight: bold; }
        .info-table, .items-table, .totals-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .info-table td { padding: 2px 4px; }
        .items-table th, .items-table td { border: 1px solid #333; padding: 4px; text-align: left; }
        .items-table th { background: #f0f0f0; }
        .totals-table td { padding: 2px 4px; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .mt-2 { margin-top: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <table class="header-table">
            <tr>
                <td class="logo-cell">
                    <img src="{{ public_path('images/logo.jpg') }}" alt="Logo" class="logo">
                </td>
                <td class="header-info">
                    <div class="branch">{{ $sale->branch->description ?? 'Sucursal' }}</div>
                    <div>{{ $sale->branch->address ?? '-' }}</div>
                    @if(!empty($sale->branch->iva_condition))
                    <div>{{ $sale->branch->iva_condition }}</div>
                    @endif
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
                <th>Producto</th>
                <th class="right">Cant.</th>
                <th class="right">Precio Unit.</th>
                <th class="right">Desc.</th>
                <th class="right">IVA</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
        @foreach($sale->items as $item)
            <tr>
                <td>{{ $item->product->description ?? 'Producto' }}</td>
                <td class="right">{{ number_format($item->quantity, 2, ',', '.') }}</td>
                <td class="right">${{ number_format($item->unit_price, 2, ',', '.') }}</td>
                <td class="right">${{ number_format($item->discount_amount ?? 0, 2, ',', '.') }}</td>
                <td class="right">${{ number_format($item->item_iva, 2, ',', '.') }}</td>
                <td class="right">${{ number_format($item->item_total, 2, ',', '.') }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
    <table class="totals-table">
        <tr>
            <td class="right bold">Subtotal:</td>
            <td class="right">${{ number_format($sale->subtotal, 2, ',', '.') }}</td>
        </tr>
        @if($sale->discount_amount > 0)
        <tr>
            <td class="right bold">Descuento:</td>
            <td class="right">- ${{ number_format($sale->discount_amount, 2, ',', '.') }}</td>
        </tr>
        @endif
        <tr>
            <td class="right bold">IVA:</td>
            <td class="right">${{ number_format($sale->total_iva_amount, 2, ',', '.') }}</td>
        </tr>
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
            <td class="right bold">TOTAL:</td>
            <td class="right bold">${{ number_format($sale->total, 2, ',', '.') }}</td>
        </tr>
    </table>
</body>
</html>
