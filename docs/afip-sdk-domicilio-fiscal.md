# SDK AFIP: Domicilio fiscal

El POS envía al SDK dos campos de domicilio del emisor para que el SDK decida cuál mostrar y pueda evolucionar la lógica en el futuro:

| Campo              | Origen en POS                    | Uso recomendado en SDK      |
|--------------------|-----------------------------------|-----------------------------|
| `issuer.domicilio` | Dirección común (sucursal/config) | Fallback                    |
| `issuer.domicilio_fiscal` | Domicilio comercial de la sucursal (Facturación Electrónica) | Domicilio a mostrar en comprobantes fiscales |

## Cambio recomendado en el SDK (resguar/afip-sdk)

En **`ReceiptRenderer::buildTemplateData()`**, al armar el array `issuer` para los templates, unificar el domicilio en un solo valor priorizando el fiscal:

```php
'issuer' => [
    'razon_social' => $invoice['issuer']['razon_social'] ?? 'Razón Social',
    'domicilio' => $invoice['issuer']['domicilio_fiscal'] ?? $invoice['issuer']['domicilio'] ?? '',
    'cuit' => $cuit,
    // ... resto igual
],
```

Así:

- Los templates siguen usando `$issuer['domicilio']` y no hace falta tocarlos.
- La regla “usar domicilio fiscal si existe, si no el común” queda en un solo lugar en el SDK.
- Cualquier mejora futura (validaciones, formatos, otros comprobantes) puede apoyarse en `domicilio_fiscal` y `domicilio` sin cambiar el POS.

## Comportamiento actual del POS

- **Comprobantes fiscales (SDK):** el POS envía `domicilio` (común) y `domicilio_fiscal` (de la sucursal). El SDK debe mostrar `domicilio_fiscal` si viene informado, sino `domicilio`.
- **Comprobantes no fiscales (Blade):** el POS usa solo la dirección común de la sucursal (`address`); no interviene el SDK.
