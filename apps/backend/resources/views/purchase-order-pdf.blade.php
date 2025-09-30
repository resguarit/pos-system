<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
    .header { display: flex; justify-content: space-between; margin-bottom: 16px; }
    .title { font-size: 18px; font-weight: bold; }
    .muted { color: #666; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 6px; }
    th { background: #f3f4f6; text-align: left; }
    .right { text-align: right; }
    .center { text-align: center; }
    .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
    .box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 8px 12px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Orden de Compra #{{ $order->id }}</div>
      <div class="muted">Fecha: {{ optional($order->order_date ?? $order->created_at)->format('d/m/Y') }}</div>
      <div class="muted">Sucursal: {{ $order->branch->description ?? 'N/A' }}</div>
    </div>
    <div>
      <div><strong>Proveedor:</strong> {{ $order->supplier->name ?? 'N/A' }}</div>
      @if(!empty($order->supplier->contact_name))
        <div class="muted">Contacto: {{ $order->supplier->contact_name }}</div>
      @endif
    </div>
  </div>

  @if(!empty($order->notes))
    <div class="box" style="margin-bottom: 10px;">
      <strong>Notas:</strong> {{ $order->notes }}
    </div>
  @endif

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th class="center">Cantidad</th>
        @if($showPrices)
          <th class="right">Precio Unit.</th>
          <th class="right">Subtotal</th>
          <th class="center">Moneda</th>
        @endif
      </tr>
    </thead>
    <tbody>
      @forelse($order->items as $item)
        <tr>
          <td>{{ $item->product->description ?? ("ID " . $item->product_id) }}</td>
          <td class="center">{{ number_format($item->quantity, 0) }}</td>
          @if($showPrices)
            <td class="right">$ {{ number_format((float)$item->purchase_price, 2, ',', '.') }}</td>
            <td class="right">$ {{ number_format($item->quantity * (float)$item->purchase_price, 2, ',', '.') }}</td>
            <td class="center">{{ $order->currency }}</td>
          @endif
        </tr>
      @empty
        <tr>
          <td colspan="{{ $showPrices ? 4 : 2 }}" class="center muted">No hay productos en esta orden</td>
        </tr>
      @endforelse
    </tbody>
  </table>

  @if($showPrices)
    <div class="totals">
      <div class="box">
        <strong>Total:</strong>
        $ {{ number_format((float)($order->total_amount ?? 0), 2, ',', '.') }} {{ $order->currency }}
      </div>
    </div>
  @endif
</body>
</html>
