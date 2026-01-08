<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Acta de Recepción - Siniestro #{{ $repair->siniestro_number }}</title>
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

        .text-center {
            text-align: center;
        }

        .text-right {
            text-align: right;
        }

        .font-bold {
            font-weight: bold;
        }

        .uppercase {
            text-transform: uppercase;
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

        .conditions {
            margin-top: 0;
            font-size: 13px;
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
            margin-top: 15px;
            text-align: center;
            font-size: 9px;
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
                <div>Fecha: {{ $date->format('d/m/Y') }}</div>
                <div style="margin-top: 5px;">Siniestro Nº: {{ $repair->siniestro_number ?? '-' }}</div>
                <div style="margin-top: 5px;">Orden Nº: {{ $repair->code }}</div>
            </td>
        </tr>
    </table>

    <div class="title">ACTA DE RECEPCIÓN DE PRODUCTO - SERVICIO TÉCNICO</div>

    <div class="content">
        En la ciudad de La Plata, a los <strong>{{ $day }}</strong> días del mes de <strong>{{ $monthName }}</strong>
        del <strong>{{ $year }}</strong>
        se deja constancia de la recepción del siguiente producto para diagnóstico y/o
        reparación para la aseguradora <strong>{{ $insurerName }}</strong> por parte de la
        empresa <strong>RESGUAR IT CONSULTORÍA EN INFORMÁTICA Y TECNOLOGÍA
            S.R.L.</strong>
    </div>

    <div class="section-title">DATOS DEL ASEGURADO</div>
    <table>
        <tr>
            <td class="label">Nombre y Apellido</td>
            <td class="value">{{ $name }}</td>
        </tr>
        <tr>
            <td class="label">Teléfono</td>
            <td class="value">{{ $phone }}</td>
        </tr>
        <tr>
            <td class="label">Email</td>
            <td class="value">{{ $email }}</td>
        </tr>
        <tr>
            <td class="label">Dirección</td>
            <td class="value">{{ $address }}</td>
        </tr>
        <tr>
            <td class="label">Póliza N°</td>
            <td class="value">{{ $repair->policy_number ?? '' }}</td>
        </tr>
    </table>

    <div class="section-title">DETALLE DEL PRODUCTO</div>
    <table>
        <tr>
            <td class="label">Artículo y Modelo</td>
            <td class="value">{{ $repair->device }}</td>
        </tr>
        <tr>
            <td class="label">Nro de Serie y Antigüedad del Bien</td>
            <td class="value">{{ $repair->serial_number ?? '-' }} /
                {{ $repair->device_age ? $repair->device_age . ' años' : '-' }}
            </td>
        </tr>
        <tr>
            <td class="label">Nro de Siniestro</td>
            <td class="value">{{ $repair->siniestro_number ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Descripción del siniestro</td>
            <td class="value">{{ $repair->issue_description }}</td>
        </tr>
    </table>

    <div class="footer-container">
        <div class="conditions">
            <strong>CONDICIONES DE RECEPCIÓN:</strong> El cliente entrega el producto mencionado para
            diagnóstico y/o reparación. <strong>RESGUAR IT</strong> no se responsabiliza por pérdidas de
            información, accesorios no declarados, ni por daños adicionales que pudieran
            surgir durante el diagnóstico. El retiro del producto deberá realizarse dentro de
            los 30 días de ser notificado.
        </div>

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

        <div class="footer">
            Generado el: {{ now()->format('d/m/Y H:i') }}
        </div>
    </div>

</body>

</html>