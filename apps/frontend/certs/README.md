## HTTPS en LAN (para probar Push Notifications)

Chrome/Safari no permiten Web Push en `http://192.168.x.x`. Necesitás HTTPS.

### 1) Instalar mkcert (macOS)

```bash
brew install mkcert
mkcert -install
```

### 2) Generar certificados para tu IP y localhost

Parado en `apps/frontend`:

```bash
mkcert -key-file certs/dev-key.pem -cert-file certs/dev-cert.pem 192.168.1.42 localhost 127.0.0.1
```

### 3) Reiniciar Vite

Reiniciá el dev server y abrí:

- `https://192.168.1.42:5173`

Luego probá el botón **Activar push**.

