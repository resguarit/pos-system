import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sileo } from "sileo"
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Lock, User, Loader2, Smartphone } from 'lucide-react';
import { AxiosError } from 'axios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Interface para errores de la API de login
interface LoginErrorResponse {
  message?: string;
  error_code?: 'SCHEDULE_RESTRICTED' | 'SESSION_CONFLICT';
  schedule?: string;
  active_sessions?: number;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSessionConflict, setShowSessionConflict] = useState(false);
  const { login, isAuthenticated } = useAuth();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const performLogin = async (forceLogout = false) => {
    setIsLoading(true);
    try {
      const response = await api.post('/login', {
        email,
        password,
        force_logout: forceLogout,
      });

      if (response.data.token) {
        login(response.data.token);
        sileo.success({ title: 'Inicio de sesión exitoso' });
      }
    } catch (error) {
      const axiosError = error as AxiosError<LoginErrorResponse>;
      const errorData = axiosError.response?.data;
      const status = axiosError.response?.status;

      console.error('Login error details:', { status, errorData, error });

      // Si es 409, asumimos conflicto de sesión (único caso 409 en login)
      if (status === 409) {
        setShowSessionConflict(true);
      } else if (status === 401) {
        sileo.error({ title: 'Credenciales incorrectas' });
      } else if (status === 403) {
        if (errorData?.error_code === 'SCHEDULE_RESTRICTED') {
          sileo.error({ title: 'Acceso no permitido en este horario',
            description: errorData?.schedule || 'Consulta con el administrador sobre tu horario de acceso.',
            duration: 8000,
          });
        } else {
          sileo.error({ title: errorData?.message || 'Tu cuenta está desactivada. Contacta al administrador.' });
        }
      } else {
        sileo.error({ title: 'Error al iniciar sesión. Inténtalo de nuevo.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(false);
  };

  const handleForceLogin = async () => {
    setShowSessionConflict(false);
    await performLogin(true);
  };

  // Si ya está autenticado, mostrar mensaje de carga
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al sistema POS
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Modal de conflicto de sesión */}
      <AlertDialog open={showSessionConflict} onOpenChange={setShowSessionConflict}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-full">
                <Smartphone className="h-6 w-6 text-orange-600" />
              </div>
              <AlertDialogTitle>Sesión activa en otro dispositivo</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Ya tienes una sesión iniciada en otro dispositivo. ¿Deseas cerrar esa sesión e iniciar aquí?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceLogin}>
              Cerrar sesión anterior e iniciar aquí
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
