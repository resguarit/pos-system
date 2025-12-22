<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Comprobante de Reparación #{{ $repair->code }}</title>
    <style>
        body {
            font-family: sans-serif;
            font-size: 12px;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
        }

        .details {
            margin-bottom: 20px;
        }

        .details table {
            width: 100%;
            border-collapse: collapse;
        }

        .details td {
            padding: 5px;
            vertical-align: top;
        }

        .label {
            font-weight: bold;
            width: 120px;
        }

        .footer {
            margin-top: 30px;
            font-size: 10px;
            text-align: center;
            color: #666;
        }

        .terms {
            margin-top: 20px;
            border: 1px solid #ddd;
            padding: 10px;
            font-size: 10px;
        }
    </style>
</head>

<body>
    <div class="header">
        <h2>Comprobante de Ingreso - Reparación</h2>
        <h3>#{{ $repair->code }}</h3>
        <p>{{ $repair->branch->description }}</p>
        <p>Fecha: {{ $date }}</p>
    </div>

    <div class="details">
        <h4>Datos del Cliente</h4>
        <table>
            <tr>
                <td class="label">Cliente:</td>
                <td>
                    @if($repair->customer && $repair->customer->person)
                        {{ $repair->customer->person->first_name }} {{ $repair->customer->person->last_name }}
                    @elseif($repair->customer)
                        {{ $repair->customer->name }}
                    @else
                        -
                    @endif
                </td>
            </tr>
            <tr>
                <td class="label">Teléfono:</td>
                <td>{{ $repair->customer->phone ?? '-' }}</td>
            </tr>
            <tr>
                <td class="label">Email:</td>
                <td>{{ $repair->customer->email ?? '-' }}</td>
            </tr>
        </table>
    </div>

    <div class="details">
        <h4>Datos del Equipo</h4>
        <table>
            <tr>
                <td class="label">Equipo:</td>
                <td>{{ $repair->device }}</td>
            </tr>
            <tr>
                <td class="label">Nro Serie:</td>
                <td>{{ $repair->serial_number ?? '-' }}</td>
            </tr>
            <tr>
                <td class="label">Categoría:</td>
                <td>{{ $repair->category->description ?? '-' }}</td>
            </tr>
            <tr>
                <td class="label">Problema:</td>
                <td>{{ $repair->issue_description }}</td>
            </tr>
            <tr>
                <td class="label">Observaciones:</td>
                <td>{{ $repair->initial_notes ?? '-' }}</td>
            </tr>
        </table>
    </div>

    <div class="terms">
        <strong>Términos y Condiciones:</strong>
        <p>1. El diagnóstico inicial es preliminar y puede variar durante la reparación.</p>
        <p>2. La empresa no se responsabiliza por la pérdida de datos. Se recomienda realizar copias de seguridad.</p>
        <p>3. Los equipos no retirados dentro de los 90 días serán considerados abandonados.</p>
    </div>

    <div class="footer">
        <p>Gracias por confiar en nosotros.</p>
    </div>
</body>

</html>