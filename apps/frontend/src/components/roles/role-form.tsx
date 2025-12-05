import type React from "react"
import features from "@/config/features"
import { PERMISSIONS_CONFIG, getActivePermissions } from "@/config/permissions"
import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import axios from "axios";

// Componentes de UI
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Hooks y Contexto
import useApi from "@/hooks/useApi"
import { useEntityContext } from "@/context/EntityContext"

// Iconos
import { ArrowLeft, Save, Loader2, Info } from "lucide-react"

// --- Interfaces ---
interface Module {
  id: string;
  name: string;
  description?: string; // allow description used when grouping
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  description: string | null;
}

interface RoleFormProps {
  roleId?: string;
  viewOnly?: boolean;
}

// --- Helper para formatear nombres de permisos y módulos ---
function formatPermissionName(name: string): string {
  if (!name) return 'Permiso';

  // Mapeo especial para nombres de módulos
  const moduleNameMap: Record<string, string> = {
    'shipments': 'Envios',
    'envios': 'Envios',
    'envíos': 'Envios',
  };

  const normalizedName = name.toLowerCase().trim();
  if (moduleNameMap[normalizedName]) {
    return moduleNameMap[normalizedName];
  }

  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// --- Mapeo de módulos a features ---
function getFeatureForModule(moduleName: string): boolean {
  const moduleToFeature: Record<string, keyof typeof features> = {
    'dashboard': 'dashboard',
    'inventario': 'inventario',
    'productos': 'inventario',
    'ventas': 'ventas',
    'historial de ventas': 'historialVentas',
    'pos': 'pos',
    'punto de venta': 'pos',
    'caja': 'caja',

    'reparaciones': 'repairs',
    'repairs': 'repairs',
    'clientes': 'clientes',
    'cuentas corrientes': 'cuentasCorrientes',
    'cuentas_corrientes': 'cuentasCorrientes',
    'proveedores': 'proveedores',
    'categorías': 'categorias',
    'categorias': 'categorias',
    'sucursales': 'sucursales',


    'usuarios': 'usuarios',
    'roles': 'roles',
    'análisis de ventas': 'analisisventas',
    'analisis de ventas': 'analisisventas',
    'analisisventas': 'analisisventas',
    'reportes de inventario': 'reportesInventario',
    'reportesInventario': 'reportesInventario',
    'reportes': 'reportesFinancieros', // Módulo del backend
    'reportes financieros': 'reportesFinancieros',
    'reportesFinancieros': 'reportesFinancieros',

    'facturación': 'facturacion',
    'facturacion': 'facturacion',
    'configuración': 'configuracionSistema',
    'configuración sistema': 'configuracionSistema',
    'configuracion': 'configuracionSistema',
    'configuracionSistema': 'configuracionSistema',
    'compras': 'purchaseOrders',
    'órdenes de compra': 'purchaseOrders',
    'ordenes de compra': 'purchaseOrders',
    'purchase orders': 'purchaseOrders',
    'purchaseOrders': 'purchaseOrders',
    'transferencias': 'transferencias',
    'transferencias de stock': 'transferencias',
    'envios': 'shipments',
    'envíos': 'shipments',
    'shipments': 'shipments',
    'envio': 'shipments',
    'auditoria': 'auditorias',
    'auditoría': 'auditorias',
    'auditorias': 'auditorias',
    'metodos_pago': 'metodosPago',
    'métodos de pago': 'metodosPago',
    'metodos de pago': 'metodosPago',
  };

  const normalizedModuleName = moduleName.toLowerCase().trim();

  // Debug log to check why modules might be filtered out
  console.log(`Checking feature for module: "${moduleName}" (normalized: "${normalizedModuleName}")`);

  // Buscar coincidencia exacta primero
  if (moduleToFeature[normalizedModuleName]) {
    return features[moduleToFeature[normalizedModuleName]];
  }

  // Buscar coincidencias parciales como fallback
  for (const [key, feature] of Object.entries(moduleToFeature)) {
    if (normalizedModuleName.includes(key) || key.includes(normalizedModuleName)) {
      return features[feature];
    }
  }

  // Si no encuentra coincidencia, retornar false para módulos no mapeados (más seguro)
  return false;
}

export default function RoleForm({ roleId, viewOnly = false }: RoleFormProps) {
  const navigate = useNavigate();
  const { request } = useApi();
  const { dispatch } = useEntityContext();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const [modules, setModules] = useState<Module[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSystem, setIsSystem] = useState(false);

  // Estados para validación de duplicados
  const [nameError, setNameError] = useState<string>("")
  const [isCheckingName, setIsCheckingName] = useState<boolean>(false)
  const [nameTimeoutId, setNameTimeoutId] = useState<number | null>(null)

  // Ref para almacenar el nombre inicial del rol (para comparación en checkNameExists)
  const initialNameRef = useRef<string>("")

  // Cleanup del timeout cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (nameTimeoutId) {
        clearTimeout(nameTimeoutId);
      }
    };
  }, [nameTimeoutId]);

  // --- Efecto Principal para Cargar Datos ---
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const loadData = async () => {
      setIsDataLoading(true);
      try {
        const permsRes = await request({ method: "GET", url: "/roles/permissions", signal });
        const permissionsData = permsRes.data || [];

        if (permissionsData.length > 0) {
          const grouped = permissionsData.reduce((acc: Record<string, Module>, perm: any) => {
            // Filtrar permisos del flujo de envíos que ya no se usan
            const flowPermissions = [
              'crear_etapas_envio',
              'editar_etapas_envio',
              'eliminar_etapas_envio',
              'configurar_visibilidad_atributos',
              'configurar_envios',
              'configurar_flujo_envio',
            ];
            if (flowPermissions.includes(perm.name)) {
              return acc; // Saltar este permiso
            }

            const moduleName = perm.module || "Permisos Generales";
            if (!acc[moduleName]) {
              acc[moduleName] = { id: moduleName, name: moduleName, description: "", permissions: [] };
            }
            acc[moduleName].permissions.push({ id: String(perm.id), name: perm.name, description: perm.description });
            return acc;
          }, {});
          setModules(Object.values(grouped));
        }

        if (roleId) {
          const [roleDetailsRes, assignedPermsRes] = await Promise.all([
            request({ method: "GET", url: `/roles/${roleId}`, signal }),
            request({ method: "GET", url: `/roles/${roleId}/permissions`, signal })
          ]);

          if (signal.aborted) return;

          const roleData = roleDetailsRes.data || roleDetailsRes;
          const assignedPermsIds = (assignedPermsRes.data || []).map((p: any) => String(p.id));

          // Almacenar el nombre inicial en el ref para la validación
          initialNameRef.current = roleData.name || "";

          setFormData({
            name: roleData.name || "",
            description: roleData.description || "",
            permissions: assignedPermsIds,
          });
          setIsSystem(!!roleData.is_system);

          dispatch({ type: 'SET_ENTITY', entityType: 'roles', id: roleId, entity: { ...roleData, permissions: assignedPermsIds } });
        }
      } catch (error: any) {
        if (!axios.isCancel(error)) {
          toast.error("Error al cargar datos", { description: "No se pudieron obtener los datos para el formulario de roles." });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsDataLoading(false);
        }
      }
    };

    loadData();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]); // Solo depender de roleId para evitar loops infinitos

  // Función para verificar si el nombre ya existe
  const checkNameExists = useCallback(async (name: string) => {
    if (!name.trim()) {
      setNameError("");
      return;
    }

    setIsCheckingName(true);
    try {
      const response = await request({
        method: 'GET',
        url: `/roles/check-name/${encodeURIComponent(name)}`
      });

      // Usar initialNameRef.current en lugar de formData.name para evitar dependencia circular
      if (response.exists && name !== initialNameRef.current) {
        setNameError("Este nombre ya está en uso");
        toast.error("Este nombre ya está en uso", {
          description: "Por favor, elige un nombre diferente para el rol."
        });
      } else {
        setNameError("");
      }
    } catch (error) {
      console.error("Error checking name:", error);
      setNameError("");
    } finally {
      setIsCheckingName(false);
    }
  }, [request]); // Remover dependencias innecesarias que causaban el loop

  // --- Manejadores y Lógica del Formulario ---
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    // Validación de duplicados con debounce para el nombre
    if (e.target.name === 'name') {
      // Limpiar timeout anterior si existe
      if (nameTimeoutId) {
        clearTimeout(nameTimeoutId);
      }

      // Crear nuevo timeout
      const newTimeoutId = window.setTimeout(() => {
        checkNameExists(e.target.value);
      }, 500);

      setNameTimeoutId(newTimeoutId);
    }
  }, [nameTimeoutId, checkNameExists]); // Incluir dependencias para evitar stale closures

  const handlePermissionChange = useCallback((permissionId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter((id) => id !== permissionId),
    }));
  }, []);

  const handleModuleToggle = useCallback((module: Module, checked: boolean) => {
    const permissionIds = module.permissions.map(p => p.id);
    setFormData(prev => {
      const otherPermissions = prev.permissions.filter(pId => !permissionIds.includes(pId));
      return {
        ...prev,
        permissions: checked ? [...otherPermissions, ...permissionIds] : otherPermissions
      };
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Validación fallida", { description: "El nombre del rol es obligatorio." });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions.map(Number),
      };
      if (roleId) {
        // Actualizar información del rol
        await request({ method: 'PUT', url: `/roles/${roleId}`, data: { name: formData.name, description: formData.description } });
        // Actualizar permisos del rol
        await request({ method: 'PUT', url: `/roles/${roleId}/permissions`, data: { permissions: formData.permissions.map(Number) } });
        toast.success("Rol actualizado con éxito.");

        // Marcar que hubo cambios en roles para forzar recarga de permisos
        localStorage.setItem('roles_updated', Date.now().toString());
      } else {
        await request({ method: 'POST', url: '/roles', data: payload });
        toast.success("Rol creado con éxito.");

        // Marcar que hubo cambios en roles
        localStorage.setItem('roles_updated', Date.now().toString());
      }
      navigate('/dashboard/roles');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Ocurrió un error inesperado.";
      toast.error("Error al guardar", { description: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData.name, formData.description, formData.permissions, roleId, request, navigate]);

  // Ref para el scroll top
  const topRef = useRef<HTMLDivElement>(null);

  // Scroll al inicio cuando se monta el componente
  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    // También intentar hacer scroll a window por si acaso
    window.scrollTo(0, 0);
  }, []);

  // --- Renderizado ---
  if (isDataLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filtrar módulos basado en las features habilitadas
  const filteredModules = modules.filter(module => getFeatureForModule(module.name));

  return (
    <div ref={topRef} className="w-full p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/dashboard/roles"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            {viewOnly ? "Ver Rol" : roleId ? "Editar Rol" : "Nuevo Rol"}
          </h2>
        </div>
        {!viewOnly && !isSystem && (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {roleId ? "Guardar Cambios" : "Crear Rol"}
          </Button>
        )}
      </div>

      <div className="space-y-4 pb-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Información del Rol</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Rol <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={viewOnly || isSubmitting || isSystem || formData.name.toLowerCase() === 'admin'}
                    required
                    className={nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus:ring-2' : ''}
                    style={{ borderColor: nameError ? '#ef4444' : undefined }}
                  />
                  {isCheckingName && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    </div>
                  )}
                </div>
                {formData.name.toLowerCase() === 'admin' && (
                  <p className="text-sm text-muted-foreground">
                    El nombre del rol Admin no puede ser modificado
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} disabled={viewOnly || isSubmitting || isSystem || formData.name.toLowerCase() === 'admin'} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permisos del Rol</CardTitle>
              <CardDescription>Selecciona los permisos para este rol. Solo se muestran los módulos habilitados en el sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alerta para rol Admin */}
              {formData.name.toLowerCase() === 'admin' && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900">Rol de Administrador</AlertTitle>
                  <AlertDescription className="text-blue-800">
                    El rol <strong>Admin</strong> tiene acceso automático a todos los permisos del sistema,
                    independientemente de los permisos seleccionados aquí. Esta configuración no puede ser modificada.
                  </AlertDescription>
                </Alert>
              )}
              {filteredModules.map((module) => (
                <div key={module.id} className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <h3 className="font-medium truncate flex-1">{formatPermissionName(module.name)}</h3>
                    <Checkbox
                      id={`module-${module.id}`}
                      checked={module.permissions.length > 0 && module.permissions.every((p) => formData.permissions.includes(p.id))}
                      onCheckedChange={(checked) => handleModuleToggle(module, !!checked)}
                      disabled={viewOnly || isSystem || isSubmitting || formData.name.toLowerCase() === 'admin'}
                    />
                  </div>
                  {module.permissions.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="grid grid-cols-1 gap-4 pl-6 md:grid-cols-2 lg:grid-cols-3">
                        {module.permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <Label
                                htmlFor={`permission-${permission.id}`}
                                className="text-sm font-normal truncate block"
                                title={permission.description || formatPermissionName(permission.name)}
                              >
                                {formatPermissionName(permission.name)}
                              </Label>
                            </div>
                            <Checkbox
                              id={`permission-${permission.id}`}
                              checked={formData.permissions.includes(permission.id)}
                              onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                              disabled={viewOnly || isSystem || isSubmitting || formData.name.toLowerCase() === 'admin'}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {filteredModules.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No hay módulos disponibles según la configuración actual del sistema.
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}