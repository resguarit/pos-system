<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Ticket</title>
    <style>
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
            /* MARGENES DE SEGURIDAD PARA IMPRESORA TÉRMICA */
            margin-left: 1mm;
            /* Espacio blanco obligatorio a la izquierda */
            margin-right: 2mm;
            margin-top: 2mm;

            /* Ancho seguro para evitar cortes y saltos de línea */
            width: 72mm;
            max-width: 72mm;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        td {
            padding: 1px 0;
            vertical-align: top;
            word-wrap: break-word;
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
        }

        .header-title {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .header-info {
            font-size: 8px;
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
            padding-top: 2px;
        }

        .total-row {
            font-size: 13px;
            font-weight: bold;
            padding-top: 5px;
        }
    </style>
</head>

<body>
    <div class="ticket-wrapper">

        <!-- HEADER: Sucursal y dirección -->
        <div class="center">
            <div class="header-title">{{ $sale->branch->description ?? 'SUCURSAL' }}</div>
            <div class="header-info">
                @if($sale->branch && $sale->branch->address)
                    {{ $sale->branch->address }}
                @endif
            </div>
        </div>

        <div class="divider"></div>

        <!-- FECHA/HORA Y NÚMERO -->
        <table style="font-size: 9px;">
            <tr>
                <td class="left bold">Fecha:
                    {{ $sale->date ? \Carbon\Carbon::parse($sale->date)->format('d/m/Y') : date('d/m/Y') }}
                </td>
                <td class="right bold">Hora:
                    {{ $sale->date ? \Carbon\Carbon::parse($sale->date)->format('H:i') : date('H:i') }}
                </td>
            </tr>
            <tr>
                <td colspan="2" class="center bold" style="font-size: 11px; padding-top: 3px;">
                    N° {{ $sale->receipt_number }}
                </td>
            </tr>
        </table>

        <div class="divider"></div>

        <!-- CLIENTE -->
        <div style="font-size: 9px;">
            <div><span class="bold">Cliente:</span>
                @if($sale->customer)
                    {{ Str::limit($sale->customer->business_name ?? (($sale->customer->person->first_name ?? '') . ' ' . ($sale->customer->person->last_name ?? '')), 35) }}
                @else
                    CONSUMIDOR FINAL
                @endif
            </div>
        </div>

        <div class="divider"></div>

        <!-- ENCABEZADO PRODUCTOS -->
        <table style="font-size: 8px; font-weight: bold; margin-bottom: 2px;">
            <tr>
                <td style="width: 15%;" class="left">CANT</td>
                <td style="width: 50%;" class="left">P.UNIT</td>
                <td style="width: 35%;" class="right">IMPORTE</td>
            </tr>
        </table>

        <!-- PRODUCTOS -->
        @foreach($sale->items as $item)
            @php
                $qty = (float) $item->quantity;
                $unitPrice = (float) ($item->unit_price ?? 0);
                $lineTotal = (float) ($item->item_total ?? 0);
            @endphp
            <div class="prod-desc">{{ $item->product->description ?? 'Item' }}</div>
            <table class="mono" style="font-size: 9px;">
                <tr>
                    <td style="width: 15%;" class="left">{{ $qty }}</td>
                    <td style="width: 50%;" class="left">${{ number_format($unitPrice, 2, ',', '.') }}</td>
                    <td style="width: 35%;" class="right bold">${{ number_format($lineTotal, 2, ',', '.') }}</td>
                </tr>
            </table>
        @endforeach

        <div class="divider"></div>

        <!-- TOTALES -->
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

        <!-- FOOTER -->
        <div class="center" style="margin-top: 5px;">
            <div style="font-size: 9px;">¡Gracias por su compra!</div>
        </div>

    </div>
</body>

</html>