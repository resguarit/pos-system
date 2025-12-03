# Certificados CA de AFIP

Esta carpeta contiene los certificados de la Autoridad Certificadora (CA) de AFIP para producción.

## Archivos

- **`AFIPRootCA2.cacert_2015-2035.crt`** y **`.pem`** - Certificado raíz de AFIP (válido 2015-2035)
- **`Computadores.cacert_2024-2035.crt`** y **`.pem`** - Certificado intermedio de Computadores (válido 2024-2035)

## ¿Para qué sirven?

Estos certificados se usan para **validar SSL/TLS** cuando tu aplicación se conecta a los servidores de AFIP (WSAA, WSFE). Validan que el servidor de AFIP es legítimo y previenen ataques "man-in-the-middle".

## ¿Cuándo se necesitan?

**Normalmente NO son necesarios** porque PHP confía en los certificados CA del sistema operativo, que ya incluyen los de AFIP.

**Pueden ser necesarios si:**
- Tu servidor tiene una configuración SSL muy estricta
- Estás en un entorno aislado sin acceso a certificados CA del sistema
- Experimentas errores de validación SSL al conectarte a AFIP en producción
- Tu servidor no tiene actualizados los certificados CA del sistema

## ¿Cómo usarlos?

Si necesitas usarlos, configura en `config/afip.php`:

```php
'ssl' => [
    'cafile' => storage_path('certificates/afip-ca/AFIPRootCA2.cacert_2015-2035.crt'),
],
```

## Nota de Seguridad

Estos son certificados **públicos** de AFIP y **SÍ pueden** estar en el repositorio Git (a diferencia de tus certificados privados de usuario que están en `.gitignore`).




