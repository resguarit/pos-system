<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Orden de Reparación #{{ $repair->code }}</title>
    <style>
        body {
            font-family: sans-serif;
            font-size: 11px;
            margin: 0;
            padding: 20px;
        }

        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .header-table td {
            vertical-align: top;
        }

        .logo-cell {
            width: 150px;
        }

        .logo {
            max-height: 60px;
            max-width: 140px;
        }

        .company-info {
            font-size: 9px;
            line-height: 1.4;
        }

        .order-info {
            text-align: right;
        }

        .order-number {
            font-size: 18px;
            font-weight: bold;
            border: 2px solid #000;
            padding: 5px 15px;
            display: inline-block;
        }

        .section-title {
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 8px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 3px;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        .data-table td {
            padding: 3px 5px;
            vertical-align: top;
        }

        .label {
            font-weight: bold;
            width: 150px;
        }

        .problem-section {
            margin-top: 15px;
            margin-bottom: 15px;
        }

        .problem-title {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .problem-content {
            padding-left: 10px;
            min-height: 40px;
        }

        .diagnosis-section {
            margin-top: 20px;
            margin-bottom: 20px;
        }

        .diagnosis-title {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .diagnosis-content {
            min-height: 60px;
            border-bottom: 1px dotted #999;
        }

        .signature-section {
            margin-top: 50px;
            page-break-inside: avoid;
        }

        .signature-table {
            width: 100%;
            border-collapse: collapse;
        }

        .signature-table td {
            width: 33%;
            text-align: center;
            padding-top: 40px;
        }

        .signature-line {
            border-top: 1px solid #000;
            margin: 0 20px;
            padding-top: 5px;
            font-size: 10px;
        }

        .terms {
            margin-top: 30px;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }

        .footer {
            margin-top: 10px;
            font-size: 8px;
            text-align: center;
            color: #999;
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
</body>

</html>