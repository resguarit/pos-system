<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: DejaVu Sans, Arial, Helvetica, sans-serif; font-size: 12px; }
    h2 { margin: 0 0 10px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
    thead { background: #f3f4f6; }
  </style>
</head>
<body>
  <h2>{{ $title ?? 'Reporte' }}</h2>
  <table>
    <thead>
      <tr>
        @foreach(($headers ?? []) as $h)
          <th>{{ $h }}</th>
        @endforeach
      </tr>
    </thead>
    <tbody>
      @foreach(($rows ?? []) as $row)
        <tr>
          @php($values = is_array($row) ? $row : array_values($row))
          @foreach($values as $v)
            <td>{{ is_scalar($v) ? $v : json_encode($v) }}</td>
          @endforeach
        </tr>
      @endforeach
    </tbody>
  </table>
</body>
</html>
