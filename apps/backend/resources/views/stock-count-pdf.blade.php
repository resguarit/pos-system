<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planilla de Conteo de Stock</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            color: #333;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }

        .logo-container {
            text-align: center;
            margin-bottom: 10px;
        }

        .company-logo {
            max-height: 60px;
            max-width: 200px;
            object-fit: contain;
        }

        .document-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .document-info {
            font-size: 10px;
            color: #666;
        }

        .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }

        .products-table th {
            background-color: #e9e9e9;
            padding: 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
        }

        .products-table td {
            padding: 6px 8px;
            border: 1px solid #ddd;
            vertical-align: middle;
        }

        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }

        @media print {
            body {
                margin: 0;
            }

            .products-table tr {
                page-break-inside: avoid;
            }
        }
    </style>
</head>

<body>
    <div class="header">
        <div class="logo-container">
            @php
                $logoPath = public_path('images/logo.jpg');
            @endphp
            @if(is_string($logoPath) && file_exists($logoPath))
                <img src="{{ $logoPath }}" alt="Logo" class="company-logo">
            @endif
        </div>
        <div class="document-title">Planilla de Conteo de Stock</div>
        <div class="document-info">
            Fecha: {{ $exportDate }} | Sucursales: {{ $branchSummary ?? (empty($branchIds) ? 'Todas' : 'Seleccionadas') }} |
            Proveedores: {{ $supplierSummary ?? (empty($supplierIds) ? 'Todos' : 'Seleccionados') }}
        </div>
    </div>

    @if($products->isEmpty())
        <div style="text-align: center; padding: 40px; color: #666;">
            <p>No hay productos disponibles para los filtros seleccionados.</p>
        </div>
    @else
        <table class="products-table">
            <thead>
                <tr>
                    <th style="width: 10%;">Codigo</th>
                    <th style="width: 22%;">Descripcion</th>
                    <th style="width: 14%;">Categoria</th>
                    <th style="width: 14%;">Proveedor</th>
                    <th style="width: 10%; text-align: right;">Precio Unit.</th>
                    <th style="width: 10%; text-align: right;">Precio Venta</th>
                    <th style="width: 10%; text-align: center;">Stock Actual</th>
                    <th style="width: 10%; text-align: center;">Conteo Fisico</th>
                    <th style="width: 10%; text-align: center;">Diferencia</th>
                </tr>
            </thead>
            <tbody>
                @foreach($products as $product)
                    <tr>
                        <td>{{ $product->code ?: '-' }}</td>
                        <td>{{ $product->description }}</td>
                        <td>{{ $product->category ? $product->category->name : '-' }}</td>
                        <td>{{ $product->supplier ? $product->supplier->name : '-' }}</td>
                        <td style="text-align: right;">
                            {{ number_format((float) ($product->unit_price ?? 0), 2, ',', '.') }}
                        </td>
                        <td style="text-align: right;">
                            {{ number_format((float) ($product->sale_price ?? 0), 2, ',', '.') }}
                        </td>
                        <td style="text-align: center;">
                            @php
                                $stockTotal = 0;
                                if (!empty($branchIds)) {
                                    $stockTotal = $product->stocks->whereIn('branch_id', $branchIds)->sum('current_stock');
                                } else {
                                    $stockTotal = $product->stocks->sum('current_stock');
                                }
                            @endphp
                            {{ intval($stockTotal) }}
                        </td>
                        <td></td>
                        <td></td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="footer">
        <p>Este documento fue generado automáticamente el {{ $exportDate }} para el conteo de inventario.</p>
    </div>
</body>

</html>