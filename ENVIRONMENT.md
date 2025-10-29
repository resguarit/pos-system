# Environment Configuration Guide

## Development Environment

### Frontend (.env.local)
```bash
VITE_API_URL=http://localhost:8000/api
VITE_APP_ENV=development
VITE_APP_NAME="POS System - Dev"
```

### Backend (.env)
```bash
APP_NAME="POS System"
APP_ENV=local
APP_KEY=base64:your-key-here
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pos_system
DB_USERNAME=root
DB_PASSWORD=
```

## Production Environment

### Frontend (.env.production)
```bash
VITE_API_URL=https://api.heroedelwhisky.com.ar/api
VITE_APP_ENV=production
VITE_APP_NAME="POS System"
```

### Backend (.env)
```bash
APP_NAME="POS System"
APP_ENV=production
APP_KEY=base64:your-production-key-here
APP_DEBUG=false
APP_URL=https://api.heroedelwhisky.com.ar

# IMPORTANTE: URL del frontend para configuración de CORS
# Esta variable debe coincidir con el dominio del frontend
FRONTEND_URL=https://heroedelwhisky.com.ar

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=pos_system
DB_USERNAME=pos_user
DB_PASSWORD=your-secure-password
```

**⚠️ Nota importante para múltiples clientes:**
- Cada cliente debe tener su propia variable `FRONTEND_URL` configurada
- Esta variable se usa para configurar CORS automáticamente
- Debe incluir el protocolo (https://) y no tener trailing slash

## Testing Environment

### Backend (.env.testing)
```bash
APP_ENV=testing
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
CACHE_DRIVER=array
SESSION_DRIVER=array
QUEUE_DRIVER=sync
```