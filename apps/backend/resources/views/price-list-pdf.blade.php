<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lista de Precios</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
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
        
        .category-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .category-title {
            background-color: #f5f5f5;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 14px;
            border-left: 4px solid #333;
            margin-bottom: 10px;
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
            vertical-align: top;
        }
        
        .product-description {
            font-weight: bold;
        }
        
        .product-price {
            text-align: right;
            font-weight: bold;
            color: #2c5aa0;
        }
        
        
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        
        .currency-info {
            background-color: #f0f8ff;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 5px;
            text-align: center;
        }
        
        @media print {
            body { margin: 0; }
            .category-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-container">
            <img src="{{ public_path('images/logo.jpg') }}" alt="Logo" class="company-logo">
        </div>
        <div class="document-title">Lista de Precios</div>
        <div class="document-info">
            Moneda: {{ $currency }} | Generado: {{ $exportDate }}
        </div>
    </div>

    <div class="currency-info">
        <strong>Precios en {{ $currency === 'ARS' ? 'Pesos Argentinos' : 'Dólares Americanos' }}</strong>
    </div>

    @if($productsByCategory->isEmpty())
        <div style="text-align: center; padding: 40px; color: #666;">
            <p>No hay productos disponibles para la moneda seleccionada.</p>
        </div>
    @else
        @foreach($productsByCategory as $categoryName => $products)
            <div class="category-section">
                <div class="category-title">{{ $categoryName }}</div>
                
                <table class="products-table">
                    <thead>
                        <tr>
                            <th style="width: 70%;">Descripción</th>
                            <th style="width: 30%;">Precio</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($products as $product)
                            <tr>
                                <td class="product-description">{{ $product->description }}</td>
                                <td class="product-price">
                                    ${{ number_format($product->sale_price, 2, ',', '.') }}
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endforeach
    @endif

    <div class="footer">
        <p>Este documento fue generado automáticamente el {{ $exportDate }}</p>
        <p>Para consultas sobre precios o disponibilidad, contacte con nuestro equipo comercial.</p>
    </div>
</body>
</html>
