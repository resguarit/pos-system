<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Ticket</title>
    <style>
        /* CSS EXACTO - NO TOCAR */
        @page {
            margin: 0;
            size: 80mm auto;
        }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 9px;
            margin: 0;
            padding: 0;
            color: #000;
        }

        .ticket-wrapper {
            /* MARGEN IZQUIERDO 10mm (Para salvar el corte de impresora) */
            margin-left: 10mm;

            /* ANCHO 60mm (Para asegurar que entre todo a la derecha) */
            width: 60mm;
            max-width: 60mm;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        td {
            padding: 1px 0;
            vertical-align: top;
            white-space: normal;
            word-wrap: break-word;
            overflow: visible;
        }

        .center {
            text-align: center;
        }

        .right {
            text-align: right;
        }

        .left {
            text-align: left;
        }

        .bold {
            font-weight: bold;
        }

        .mono {
            font-family: 'DejaVu Sans Mono', monospace;
            font-size: 9px;
        }

        .header-title {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
        }

        .header-info {
            font-size: 8px;
            text-align: center;
        }

        .divider {
            border-bottom: 1px dashed #000;
            margin: 3px 0;
            width: 100%;
            display: block;
        }

        .prod-desc {
            font-size: 9px;
            font-weight: bold;
            padding-top: 3px;
            display: block;
            width: 100%;
        }

        .total-row {
            font-size: 12px;
            font-weight: bold;
            padding-top: 5px;
        }
    </style>
</head>

<body>
    @php
        $name = null;
        try {
            if (class_exists('\App\Models\Setting')) {
                $companyName = \App\Models\Setting::where('key', 'company_name')->first();
                $name = $companyName ? json_decode($companyName->value, true) : null;
            }
        } catch (\Exception $e) {
        }
    @endphp

    <div class="ticket-wrapper">

        <div class="header-title">{{ $name ?? ($sale->branch->description ?? 'SUCURSAL') }}</div>
        <div class="header-info">
            @if($sale->branch && $sale->branch->address)
                {{ $sale->branch->address }}
            @endif
        </div>
        <div class="divider"></div>

        <table style="font-size: 9px;">
            <tr>
                <td class="left bold">Fecha:
                    {{ $sale->date ? \Carbon\Carbon::parse($sale->date)->format('d/m/Y') : date('d/m/Y') }}</td>
                <td class="right bold">Hora:
                    {{ $sale->date ? \Carbon\Carbon::parse($sale->date)->format('H:i') : date('H:i') }}</td>
            </tr>
        </table>

        <div class="divider"></div>

        <table style="font-size: 8px; font-weight: bold; margin-bottom: 2px;">
            <tr>
                <td style="width: 15%;" class="left">CANT</td>
                <td style="width: 40%;" class="left">P.UNIT</td>
                <td style="width: 45%;" class="right">IMPORTE</td>
            </tr>
        </table>

        @foreach($sale->items as $item)
            @php
                $qty = (float) $item->quantity;
                $unitPrice = (float) ($item->unit_price ?? 0);
                $lineTotal = (float) ($item->item_total ?? 0);
            @endphp

            <div class="prod-desc">{{ $item->product->description ?? 'Item' }}</div>

            <table class="mono">
                <tr>
                    <td style="width: 15%;" class="left">{{ $qty }}</td>
                    <td style="width: 40%;" class="left">${{ number_format($unitPrice, 2, ',', '.') }}</td>
                    <td style="width: 45%;" class="right bold">${{ number_format($lineTotal, 2, ',', '.') }}</td>
                </tr>
            </table>
        @endforeach

        <div class="divider"></div>

        <table style="font-size: 10px;">
            <tr>
                <td class="right">Subtotal:</td>
                <td class="right mono">${{ number_format($sale->subtotal, 2, ',', '.') }}</td>
            </tr>
            @if($sale->discount_amount > 0)
                <tr>
                    <td class="right">Descuento:</td>
                    <td class="right mono">-${{ number_format($sale->discount_amount, 2, ',', '.') }}</td>
                </tr>
            @endif
            <tr class="total-row">
                <td class="right">TOTAL:</td>
                <td class="right mono">${{ number_format($sale->total, 2, ',', '.') }}</td>
            </tr>
        </table>

        <div class="divider"></div>

        <div class="center" style="margin-top: 5px;">
            <div style="font-size: 9px;">¡Gracias por su compra!</div>
        </div>

    </div>
</body>

</html>