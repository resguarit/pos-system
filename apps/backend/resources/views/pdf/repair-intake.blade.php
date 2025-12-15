<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de Reparación - {{ $repair->code }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            padding: 20px;
        }

        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .header h1 {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .header .subtitle {
            font-size: 14px;
            color: #666;
        }

        .info-grid {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }

        .info-row {
            display: table-row;
        }

        .info-cell {
            display: table-cell;
            width: 50%;
            padding: 8px 10px;
            vertical-align: top;
        }

        .info-cell:first-child {
            border-right: 1px solid #ddd;
        }

        .section {
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 13px;
            font-weight: bold;
            background-color: #f5f5f5;
            padding: 8px 10px;
            border-left: 4px solid #333;
            margin-bottom: 10px;
        }

        .field {
            margin-bottom: 8px;
        }

        .field-label {
            font-weight: bold;
            color: #555;
            display: inline-block;
            min-width: 120px;
        }

        .field-value {
            display: inline;
        }

        .priority-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 11px;
        }

        .priority-alta {
            background-color: #fecaca;
            color: #b91c1c;
        }

        .priority-media {
            background-color: #fef3c7;
            color: #b45309;
        }

        .priority-baja {
            background-color: #d1fae5;
            color: #047857;
        }

        .description-box {
            background-color: #fafafa;
            border: 1px solid #e5e5e5;
            padding: 12px;
            border-radius: 4px;
            min-height: 60px;
        }

        .signature-section {
            margin-top: 40px;
            display: table;
            width: 100%;
        }

        .signature-box {
            display: table-cell;
            width: 45%;
            text-align: center;
            padding-top: 30px;
        }

        .signature-line {
            border-top: 1px solid #333;
            width: 80%;
            margin: 0 auto;
            padding-top: 5px;
        }

        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 15px;
        }

        .terms {
            margin-top: 20px;
            padding: 10px;
            background-color: #f9f9f9;
            border: 1px solid #eee;
            font-size: 10px;
            color: #666;
        }

        .terms h4 {
            font-size: 11px;
            margin-bottom: 5px;
        }

        .terms ul {
            padding-left: 15px;
        }

        .terms li {
            margin-bottom: 3px;
        }

        .code-big {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>COMPROBANTE DE INGRESO - REPARACIÓN</h1>
        <p class="subtitle">Servicio Técnico</p>
    </div>

    <div class="info-grid">
        <div class="info-row">
            <div class="info-cell">
                <div class="field">
                    <span class="field-label">Código:</span>
                    <span class="field-value code-big">{{ $repair->code }}</span>
                </div>
                <div class="field">
                    <span class="field-label">Fecha de ingreso:</span>
                    <span
                        class="field-value">{{ $repair->intake_date ? $repair->intake_date->format('d/m/Y') : $date }}</span>
                </div>
                @if($repair->estimated_date)
                    <div class="field">
                        <span class="field-label">Fecha estimada:</span>
                        <span class="field-value">{{ $repair->estimated_date->format('d/m/Y') }}</span>
                    </div>
                @endif
            </div>
            <div class="info-cell">
                <div class="field">
                    <span class="field-label">Sucursal:</span>
                    <span class="field-value">{{ $repair->branch->description ?? 'N/D' }}</span>
                </div>
                <div class="field">
                    <span class="field-label">Técnico:</span>
                    <span class="field-value">{{ $repair->technician->name ?? 'Sin asignar' }}</span>
                </div>
                <div class="field">
                    <span class="field-label">Prioridad:</span>
                    <span
                        class="priority-badge priority-{{ strtolower($repair->priority) }}">{{ $repair->priority }}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DATOS DEL CLIENTE</div>
        <div class="field">
            <span class="field-label">Nombre:</span>
            <span class="field-value">
                @if($repair->customer && $repair->customer->person)
                    {{ $repair->customer->person->first_name }} {{ $repair->customer->person->last_name }}
                @else
                    N/D
                @endif
            </span>
        </div>
        @if($repair->customer && $repair->customer->person && $repair->customer->person->phone)
            <div class="field">
                <span class="field-label">Teléfono:</span>
                <span class="field-value">{{ $repair->customer->person->phone }}</span>
            </div>
        @endif
        @if($repair->customer && $repair->customer->person && $repair->customer->person->email)
            <div class="field">
                <span class="field-label">Email:</span>
                <span class="field-value">{{ $repair->customer->person->email }}</span>
            </div>
        @endif
    </div>

    <div class="section">
        <div class="section-title">DATOS DEL EQUIPO</div>
        <div class="field">
            <span class="field-label">Equipo:</span>
            <span class="field-value">{{ $repair->device }}</span>
        </div>
        @if($repair->serial_number)
            <div class="field">
                <span class="field-label">Número de serie:</span>
                <span class="field-value">{{ $repair->serial_number }}</span>
            </div>
        @endif
    </div>

    <div class="section">
        <div class="section-title">DESCRIPCIÓN DEL PROBLEMA</div>
        <div class="description-box">
            {{ $repair->issue_description }}
        </div>
    </div>

    @if($repair->initial_notes)
        <div class="section">
            <div class="section-title">OBSERVACIONES INICIALES</div>
            <div class="description-box">
                {{ $repair->initial_notes }}
            </div>
        </div>
    @endif

    @if($repair->cost)
        <div class="section">
            <div class="field">
                <span class="field-label">Presupuesto estimado:</span>
                <span class="field-value"
                    style="font-size: 14px; font-weight: bold;">${{ number_format($repair->cost, 2, ',', '.') }}</span>
            </div>
        </div>
    @endif

    <div class="terms">
        <h4>TÉRMINOS Y CONDICIONES:</h4>
        <ul>
            <li>El plazo de entrega es estimativo y puede variar según la disponibilidad de repuestos.</li>
            <li>Los equipos no retirados dentro de los 30 días de reparados serán considerados en abandono.</li>
            <li>La garantía de reparación es de 90 días y cubre únicamente el trabajo realizado.</li>
            <li>No nos hacemos responsables por pérdida de datos. Realice respaldo antes de entregar el equipo.</li>
        </ul>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <div class="signature-line">Firma del Cliente</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">Firma del Técnico</div>
        </div>
    </div>

    <div class="footer">
        <p>Documento generado el {{ $date }} | Código: {{ $repair->code }}</p>
        <p>Este comprobante es su constancia de ingreso del equipo a reparación.</p>
    </div>
</body>

</html>