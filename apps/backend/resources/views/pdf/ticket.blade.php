<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Ticket {{ $sale->receipt_number }}</title>
    <style>
        @page {
            margin: 0;
        }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
            margin: 0;
            padding: 10mm;
            width: 80mm;
            max-width: 80mm;
            color: #000;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        td {
            padding: 2px 0;
            vertical-align: top;
        }

        .center {
            text-align: center;
        }

        .right {
            text-align: right;
        }

        .bold {
            font-weight: bold;
        }

        .divider td {
            border-bottom: 1px dashed #000;
            height: 1px;
            padding: 3px 0;
        }
    </style>
</head>

<body>
    @php
        $companyName = \App\Models\Setting::where('key', 'company_name')->first();
        $companyPhone = \App\Models\Setting::where('key', 'company_phone')->first();

        $name = $companyName ? json_decode($companyName->value, true) : '';
        $phone = $companyPhone ? json_decode($companyPhone->value, true) : '';

        $totalIva = 0;
        if ($sale->saleIvas && $sale->saleIvas->count() > 0) {
            foreach ($sale->saleIvas as $saleIva) {
                $totalIva += (float) $saleIva->amount;
            }
        }
    @endphp

    <table>
        <!-- HEADER -->
        <tr>
            <td class="center bold" style="font-size: 12px;">{{ $name ?: ($sale->branch->description ?? 'EMPRESA') }}
            </td>
        </tr>
        @if($sale->branch && $sale->branch->address)
            <tr>
                <td class="center" style="font-size: 9px;">{{ $sale->branch->address }}</td>
            </tr>
        @endif
        @if($phone || ($sale->branch && $sale->branch->phone))
            <tr>
                <td class="center" style="font-size: 9px;">Tel: {{ $phone ?: $sale->branch->phone }}</td>
            </tr>
        @endif

        <!-- DIVIDER -->
        <tr class="divider">
            <td></td>
        </tr>

        <!-- NÚMERO -->
        <tr>
            <td class="center bold" style="font-size: 11px;">N° {{ $sale->receipt_number }}</td>
        </tr>
        <tr>
            <td class="center" style="font-size: 9px;">
                {{ $sale->date ? \Carbon\Carbon::parse($sale->date)->format('d/m/Y H:i') : '-' }}
            </td>
        </tr>

        <!-- DIVIDER -->
        <tr class="divider">
            <td></td>
        </tr>

        <!-- CLIENTE -->
        <tr>
            <td style="font-size: 9px;">
                <span class="bold">Cliente:</span>
                @if($sale->customer)
                    {{ $sale->customer->business_name ?? (($sale->customer->person->first_name ?? '') . ' ' . ($sale->customer->person->last_name ?? '')) }}
                @else
                    Consumidor Final
                @endif
            </td>
        </tr>

        <!-- DIVIDER -->
        <tr class="divider">
            <td></td>
        </tr>
    </table>

    <!-- PRODUCTOS -->
    <table>
        @foreach($sale->items as $item)
            @php
                $qty = (int) $item->quantity;
                $total = (int) round($item->item_total);
            @endphp
            <tr>
                <td colspan="2" class="bold" style="font-size: 9px;">{{ $item->product->description ?? 'Producto' }}</td>
            </tr>
            <tr>
                <td style="font-size: 9px; width: 50%;">x{{ $qty }}</td>
                <td class="right" style="font-size: 9px; width: 50%;">${{ number_format($total, 0, ',', '.') }}</td>
            </tr>
        @endforeach
    </table>

    <table>
        <!-- DIVIDER -->
        <tr class="divider">
            <td></td>
        </tr>

        <!-- TOTALES -->
        <tr>
            <td class="center" style="font-size: 10px;">Subtotal:
                ${{ number_format((int) round($sale->subtotal), 0, ',', '.') }}</td>
        </tr>

        @if($totalIva > 0)
            <tr>
                <td class="center" style="font-size: 10px;">IVA: ${{ number_format((int) round($totalIva), 0, ',', '.') }}
                </td>
            </tr>
        @endif

        @if($sale->discount_amount > 0)
            <tr>
                <td class="center" style="font-size: 10px;">Desc:
                    -${{ number_format((int) round($sale->discount_amount), 0, ',', '.') }}</td>
            </tr>
        @endif

        <!-- DIVIDER -->
        <tr class="divider">
            <td></td>
        </tr>

        <!-- TOTAL -->
        <tr>
            <td class="center bold" style="font-size: 12px; padding: 5px 0;">Total
                ${{ number_format((int) round($sale->total), 0, ',', '.') }}</td>
        </tr>

        <!-- DIVIDER -->
        <tr class="divider">
            <td></td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td class="center" style="font-size: 9px; padding-top: 5px;">¡Gracias por su compra!</td>
        </tr>
    </table>
</body>

</html>