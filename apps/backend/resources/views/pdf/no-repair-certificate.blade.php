<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Acta Sin Reparación #{{ $repair->code }}</title>
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
            position: relative;
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
            max-width: 130px;
        }

        .company-info {
            font-size: 13px;
            line-height: 1.5;
        }

        .order-info {
            text-align: right;
            font-size: 14px;
        }

        .title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 20px;
            text-transform: uppercase;
            border-top: 3px solid #000;
            border-bottom: 3px solid #000;
            padding: 8px 0;
        }

        .content {
            text-align: justify;
            margin-bottom: 15px;
            font-size: 15px;
        }

        .section-title {
            font-weight: bold;
            background-color: #000;
            color: #fff;
            padding: 6px 12px;
            margin-top: 15px;
            margin-bottom: 0;
            text-transform: uppercase;
            font-size: 14px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        td {
            border: 1px solid #000;
            padding: 8px 12px;
            vertical-align: middle;
        }

        .label {
            font-weight: bold;
            width: 30%;
            background-color: #f0f0f0;
        }

        .value {
            width: 70%;
        }

        .footer-container {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
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
            margin-top: 15px;
            text-align: center;
            font-size: 9px;
            color: #666;
        }
    </style>
</head>

<body>
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
                <div>Fecha y hora: {{ $date->format('d/m/Y H:i') }}</div>
                <div style="margin-top: 5px;">Orden Nº: {{ $repair->code }}</div>
            </td>
        </tr>
    </table>

    <div class="title">ACTA SIN REPARACION</div>

    <div class="content">
        En la ciudad de La Plata, a los <strong>{{ $day }}</strong> dias del mes de <strong>{{ $monthName }}</strong>
        del <strong>{{ $year }}</strong> se deja constancia que el equipo detallado a continuacion no tiene reparacion.
    </div>

    <div class="section-title">DATOS DEL CLIENTE</div>
    <table>
        <tr>
            <td class="label">Nombre y Apellido</td>
            <td class="value">
                @if($repair->customer && $repair->customer->person)
                    {{ trim(($repair->customer->person->first_name ?? '') . ' ' . ($repair->customer->person->last_name ?? '')) ?: '-' }}
                @else
                    -
                @endif
            </td>
        </tr>
        <tr>
            <td class="label">Telefono</td>
            <td class="value">{{ $repair->customer->phone ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Email</td>
            <td class="value">{{ $repair->customer->email ?? '-' }}</td>
        </tr>
    </table>

    <div class="section-title">DETALLE DEL EQUIPO</div>
    <table>
        <tr>
            <td class="label">Articulo y Modelo</td>
            <td class="value">{{ $repair->device }}</td>
        </tr>
        <tr>
            <td class="label">Nro de Serie</td>
            <td class="value">{{ $repair->serial_number ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Fecha de ingreso</td>
            <td class="value">{{ \Carbon\Carbon::parse($repair->intake_date)->format('d/m/Y') }}</td>
        </tr>
    </table>

    <div class="section-title">DIAGNÓSTICO TÉCNICO</div>
    <table>
        <tr>
            <td class="value" style="border: 1px solid #000; padding: 12px;">
                {{ $repair->diagnosis ?: 'Sin diagnóstico registrado' }}
            </td>
        </tr>
    </table>

    @if($repair->is_siniestro)
    <div class="section-title">DATOS DEL SINIESTRO</div>
    <table>
        <tr>
            <td class="label">Número de Siniestro</td>
            <td class="value">{{ $repair->siniestro_number ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Número de Póliza</td>
            <td class="value">{{ $repair->policy_number ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Aseguradora</td>
            <td class="value">{{ $repair->insurer->name ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Antigüedad del Equipo</td>
            <td class="value">{{ $repair->device_age ?? '-' }}</td>
        </tr>
    </table>

    <div class="section-title">CLIENTE ASEGURADO</div>
    <table>
        <tr>
            <td class="label">Nombre y Apellido</td>
            <td class="value">
                @if($repair->insuredCustomer && $repair->insuredCustomer->person)
                    {{ trim(($repair->insuredCustomer->person->first_name ?? '') . ' ' . ($repair->insuredCustomer->person->last_name ?? '')) ?: '-' }}
                @else
                    -
                @endif
            </td>
        </tr>
        <tr>
            <td class="label">Telefono</td>
            <td class="value">{{ $repair->insuredCustomer->phone ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Email</td>
            <td class="value">{{ $repair->insuredCustomer->email ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Domicilio</td>
            <td class="value">{{ $repair->insuredCustomer->person->address ?? '-' }}</td>
        </tr>
    </table>
    @endif

    <div class="footer-container">
        <table class="signature-table">
            <tr>
                <td>
                    <div class="signature-line">Firma del cliente</div>
                </td>
                <td>
                    <div class="signature-line">Firma del tecnico</div>
                </td>
                <td>
                    <div class="signature-line">Sello de la empresa</div>
                </td>
            </tr>
        </table>
        <div class="footer">
            Este acta es valida sin enmiendas ni tachaduras.
        </div>
    </div>
</body>

</html>
