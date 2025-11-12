import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SystemInfo {
  apiUrl: string;
  environment: string;
  buildTime: string;
  domain: string;
  backendStatus: 'online' | 'offline' | 'checking';
  backendResponse?: any;
}

export default function DebugInfoPage() {
  const [info, setInfo] = useState<SystemInfo>({
    apiUrl: import.meta.env.VITE_API_URL || 'Not configured',
    environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'unknown',
    buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
    domain: window.location.hostname,
    backendStatus: 'checking',
  });

  useEffect(() => {
    // Verificar estado del backend
    fetch(`${import.meta.env.VITE_API_URL || ''}/up`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
      .then(res => {
        if (res.ok) {
          return res.text().then(text => {
            try {
              return JSON.parse(text);
            } catch {
              return { status: 'ok', html: text };
            }
          });
        }
        throw new Error(`HTTP ${res.status}`);
      })
      .then(data => {
        setInfo(prev => ({
          ...prev,
          backendStatus: 'online',
          backendResponse: data,
        }));
      })
      .catch(() => {
        setInfo(prev => ({
          ...prev,
          backendStatus: 'offline',
        }));
      });
  }, []);

  const getClientName = () => {
    const domain = window.location.hostname.toLowerCase();
    if (domain.includes('hela-ditos') || domain.includes('heladitos')) return 'Hela Ditos';
    if (domain.includes('heroe') || domain.includes('heroedelwhisky')) return 'Heroe del Whisky';
    if (domain.includes('enriqueta') || domain.includes('laenriquetabar')) return 'La Enrique Bar';
    return 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🔍 System Debug Info
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Información del sistema para verificar deployment
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cliente y Dominio</CardTitle>
            <CardDescription>Información del cliente actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cliente</p>
                <p className="text-lg font-semibold">{getClientName()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Dominio</p>
                <p className="text-lg font-semibold">{info.domain}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración Frontend</CardTitle>
            <CardDescription>Variables de entorno y configuración</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">API URL</p>
                <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm break-all">
                  {info.apiUrl}
                </code>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Entorno</p>
                <Badge variant={info.environment === 'production' ? 'default' : 'secondary'}>
                  {info.environment}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Build Time</p>
                <p className="text-sm font-mono">
                  {new Date(info.buildTime).toLocaleString('es-AR', {
                    dateStyle: 'full',
                    timeStyle: 'long',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado del Backend</CardTitle>
            <CardDescription>Conectividad con la API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                info.backendStatus === 'online' ? 'bg-green-500 animate-pulse' :
                info.backendStatus === 'offline' ? 'bg-red-500' :
                'bg-yellow-500 animate-pulse'
              }`} />
              <span className="font-semibold">
                {info.backendStatus === 'online' ? '✅ Online' :
                 info.backendStatus === 'offline' ? '❌ Offline' :
                 '⏳ Verificando...'}
              </span>
            </div>
            {info.backendResponse && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Respuesta del Backend</p>
                <pre className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(info.backendResponse, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Navegador</CardTitle>
            <CardDescription>Detalles del cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">User Agent</p>
                <p className="font-mono text-xs break-all">{navigator.userAgent}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">URL Completa</p>
                <p className="font-mono text-xs break-all">{window.location.href}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Versión del Deployment</CardTitle>
            <CardDescription>Información de la versión desplegada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Git Commit</span>
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {import.meta.env.VITE_GIT_COMMIT || 'N/A'}
                </code>
              </div>
              {import.meta.env.VITE_GIT_COMMIT_DATE && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Commit Date</span>
                  <p className="text-xs font-mono">
                    {new Date(import.meta.env.VITE_GIT_COMMIT_DATE).toLocaleString('es-AR', {
                      dateStyle: 'full',
                      timeStyle: 'long',
                    })}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Build Time</span>
                <p className="text-xs font-mono">
                  {new Date(info.buildTime).toLocaleString('es-AR', {
                    dateStyle: 'full',
                    timeStyle: 'long',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4">
          <p>🔒 Esta página es solo para verificación de deployment</p>
          <p className="mt-1">No está visible en el menú de navegación</p>
        </div>
      </div>
    </div>
  );
}

