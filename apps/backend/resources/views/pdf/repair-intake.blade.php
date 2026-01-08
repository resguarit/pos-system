<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Orden de Reparación #{{ $repair->code }}</title>
    <style>
        @page {
            size: A4;
            margin: 1.5cm;
        }

        body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            margin: 0;
            padding: 0;
            line-height: 1.4;
            height: 26.7cm;
            /* A4 height 29.7cm - margins (1.5cm * 2) */
            position: relative;
        }

        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }

        .header-table td {
            vertical-align: top;
        }

        .logo-cell {
            width: 150px;
        }

        .logo {
            max-height: 60px;
            max-width: 130px;
        }

        .company-info {
            font-size: 13px;
            line-height: 1.5;
        }

        .order-info {
            text-align: right;
        }

        .order-number {
            font-size: 24px;
            font-weight: bold;
            border: 2px solid #000;
            padding: 10px 26px;
            display: inline-block;
        }

        .section-title {
            font-weight: bold;
            font-size: 16px;
            margin-top: 15px;
            margin-bottom: 8px;
            border-bottom: 2px solid #ccc;
            padding-bottom: 3px;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }

        .data-table td {
            padding: 6px 10px;
            vertical-align: top;
        }

        .label {
            font-weight: bold;
            width: 160px;
        }

        .problem-section {
            margin-top: 15px;
            margin-bottom: 15px;
        }

        .problem-title {
            font-weight: bold;
            font-size: 17px;
            margin-bottom: 10px;
        }

        .problem-content {
            padding-left: 15px;
            font-size: 16px;
            min-height: 50px;
        }

        .diagnosis-section {
            margin-top: 15px;
            margin-bottom: 15px;
        }

        .diagnosis-title {
            font-weight: bold;
            font-size: 17px;
            margin-bottom: 10px;
        }

        .diagnosis-content {
            border-bottom: 2px dotted #999;
            font-size: 16px;
            padding-bottom: 10px;
            min-height: 60px;
        }

        .footer-container {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
        }

        .signature-section {
            margin-top: 0;
        }

        .terms {
            margin-top: 20px;
            font-size: 13px;
            color: #000;
            border-top: 2px solid #000;
            padding-top: 10px;
            text-align: justify;
            line-height: 1.6;
            margin-bottom: 20px;
        }

        .signature-table {
            width: 100%;
            border-collapse: collapse;
        }

        .signature-table td {
            width: 33.33%;
            text-align: center;
            padding-top: 50px;
            border: none;
        }

        .signature-line {
            border-top: 1px solid #000;
            margin: 0 15px;
            padding-top: 5px;
            font-size: 11px;
            font-weight: bold;
        }

        .footer {
            margin-top: 10px;
            font-size: 10px;
            text-align: center;
            color: #666;
        }
    </style>
</head>

<body>
    {{-- HEADER --}}
    <table class="header-table">
        <tr>
            <td class="logo-cell">
                @php
                    $logoUrl = public_path('images/logo.jpg');
                    $logoSetting = \App\Models\Setting::where('key', 'logo_url')->first();
                    if ($logoSetting && !empty($logoSetting->value)) {
                        $logoPath = json_decode($logoSetting->value, true);
                        if (is_array($logoPath) && isset($logoPath[0])) {
                            $logoPath = $logoPath[0];
                        }
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
            <td class="company-info">
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">RESGUAR IT</div>
                <strong>{{ $repair->branch->description ?? 'Sucursal' }}</strong><br>
                @if($repair->branch->address)
                    {{ $repair->branch->address }}<br>
                @endif
                @if($repair->branch->phone)
                    Tel: {{ $repair->branch->phone }}
                @endif
            </td>
            <td class="order-info">
                <div>Fecha: {{ $date }}</div>
                <div style="margin-top: 5px;">Orden de Reparación Nº</div>
                <div class="order-number">{{ $repair->code }}</div>
            </td>
        </tr>
    </table>

    {{-- DATOS DEL CLIENTE --}}
    <div class="section-title">Datos del Cliente</div>
    <table class="data-table">
        <tr>
            <td class="label">Cliente:</td>
            <td colspan="3">
                @if($repair->customer && $repair->customer->person)
                    {{ trim(($repair->customer->person->first_name ?? '') . ' ' . ($repair->customer->person->last_name ?? '')) ?: '-' }}
                @else
                    -
                @endif
            </td>
        </tr>
        <tr>
            <td class="label">Teléfono:</td>
            <td>{{ $repair->customer->phone ?? '-' }}</td>
            <td class="label">Email:</td>
            <td>{{ $repair->customer->email ?? '-' }}</td>
        </tr>
    </table>

    {{-- DATOS DEL EQUIPO --}}
    <div class="section-title">Datos del Equipo</div>
    <table class="data-table">
        <tr>
            <td class="label">Producto Recibido:</td>
            <td>{{ $repair->device }}</td>
            <td class="label">Serial:</td>
            <td>{{ $repair->serial_number ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Categoría:</td>
            <td>{{ $repair->category->name ?? '-' }}</td>
            <td class="label">Fecha de Consulta:</td>
            <td>{{ \Carbon\Carbon::parse($repair->intake_date)->format('d/m/Y') }}</td>
        </tr>
        @if($repair->is_siniestro)
            <tr>
                <td class="label">Aseguradora:</td>
                <td>{{ $repair->insurer->name ?? '-' }}</td>
                <td class="label">Nro. de Siniestro:</td>
                <td>{{ $repair->siniestro_number ?? '-' }}</td>
            </tr>
        @endif
    </table>

    {{-- PROBLEMA MANIFESTADO --}}
    <div class="problem-section">
        <div class="problem-title">Inconveniente manifestado por el cliente:</div>
        <div class="problem-content">{{ $repair->issue_description ?? '-' }}</div>
    </div>

    {{-- ACCESORIOS --}}
    <div class="problem-section">
        <div class="problem-title">Accesorios:</div>
        <div class="problem-content">{{ $repair->initial_notes ?: 'NO' }}</div>
    </div>

    {{-- DIAGNÓSTICO / REPARACIÓN --}}
    <div class="diagnosis-section">
        <div class="diagnosis-title">Diagnóstico / Reparación:</div>
        <div class="diagnosis-content">{{ $repair->diagnosis ?? '' }}</div>
    </div>

    {{-- FOOTER CONTAINER --}}
    <div class="footer-container">
        {{-- FIRMA --}}
        <div class="signature-section">
            <table class="signature-table">
                <tr>
                    <td>
                        <div class="signature-line">Firma</div>
                    </td>
                    <td>
                        <div class="signature-line">Aclaración</div>
                    </td>
                    <td>
                        <div class="signature-line">DNI</div>
                    </td>
                </tr>
            </table>
        </div>

        {{-- TÉRMINOS --}}
        <div class="terms">
            <strong>IMPORTANTE:</strong> Para retirar el producto deberá presentarse con este comprobante.
            Si no es retirado después de los 90 días, se considerará abandonado conforme a los artículos 2525 y 2526 del
            Código Civil.
            La empresa no se responsabiliza por la pérdida total o parcial de los datos almacenados en el equipo.
        </div>

        <div class="footer">
            Fecha y Hora de Impresión: {{ now()->format('d/m/Y H:i:s') }}
        </div>
    </div>
</body>

</html>