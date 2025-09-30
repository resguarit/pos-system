<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: DejaVu Sans, Arial, Helvetica, sans-serif; font-size: 12px; }
    h2 { margin: 0 0 10px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
    thead { background: #f3f4f6; }
    .summary { margin-bottom: 10px; }
    .label { color: #555; margin-right: 6px; }
  </style>
</head>
<body>
  <h2>{{ $title ?? 'Reporte Financiero' }}</h2>

  <div class="summary">
    <div><span class="label">Período:</span> {{ $period }}</div>
    <div><span class="label">Desde:</span> {{ optional($from)->format('d/m/Y') }}</div>
    <div><span class="label">Hasta:</span> {{ optional($to)->format('d/m/Y') }}</div>
    <div><span class="label">Ingresos:</span> {{ number_format($income ?? 0, 2, ',', '.') }}</div>
    <div><span class="label">Egresos:</span> {{ number_format($expense ?? 0, 2, ',', '.') }}</div>
    <div><span class="label">Neto:</span> {{ number_format($net ?? 0, 2, ',', '.') }}</div>
  </div>

  @if(($detail ?? 'summary') === 'detailed')
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Ingresos</th>
          <th>Egresos</th>
          <th>Neto</th>
        </tr>
      </thead>
      <tbody>
        @foreach(($rows ?? []) as $r)
          <tr>
            <td>{{ $r['fecha'] ?? '' }}</td>
            <td>{{ $r['ingresos'] ?? '0.00' }}</td>
            <td>{{ $r['egresos'] ?? '0.00' }}</td>
            <td>{{ $r['neto'] ?? '0.00' }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  @endif
</body>
</html>
