# POS System

Sistema de Punto de Venta con Frontend (React + Vite) y Backend (Laravel).

## Estructura del Proyecto

```
pos-system/
├── apps/
│   ├── frontend/          # React + Vite + TypeScript
│   └── backend/           # Laravel 11 + PHP 8.1
├── .github/
│   └── workflows/         # GitHub Actions para CI/CD
├── scripts/               # Scripts de deploy
└── package.json           # Configuración del workspace
```

## Desarrollo Local

### Prerrequisitos
- Node.js 18+
- PHP 8.1+
- Composer
- MySQL/PostgreSQL

### Instalación

```bash
# Instalar dependencias de todos los proyectos
npm run install:all

# Desarrollo (ambos servicios)
npm run dev

# Solo frontend
npm run dev:frontend

# Solo backend
npm run dev:backend
```

### Build

```bash
# Build del frontend
npm run build
```

## Deploy

### Frontend
- Se sube automáticamente la carpeta `dist` al VPS
- Configurado en `.github/workflows/deploy-frontend.yml`

### Backend
- Se hace `git pull` automáticamente en el VPS
- Configurado en `.github/workflows/deploy-backend.yml`

## Variables de Entorno

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
```

### Backend (.env)
```
APP_URL=http://localhost:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pos_db
DB_USERNAME=root
DB_PASSWORD=
```

## Scripts Disponibles

- `npm run dev` - Desarrollo completo
- `npm run build` - Build del frontend
- `npm run lint` - Linting del frontend
- `npm run test` - Tests del frontend
- `npm run install:all` - Instalar todas las dependencias
