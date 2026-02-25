import type React from "react"
import features from "@/config/features"
import { useState, useEffect, useCallback } from "react"
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
import { sileo } from "sileo"
import useApi from "@/hooks/useApi"
import { useEntityContext } from "@/context/EntityContext"

// Iconos
import { ArrowLeft, Save, Loader2 } from "lucide-react"

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

// --- Helper para formatear nombres de permisos ---
function formatPermissionName(name: string): string {
  if (!name) return 'Permiso';
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// --- Mapeo de módulos a features ---
function getFeatureForModule(moduleName: string): boolean {
  const moduleToFeature: Record<string, keyof typeof FEATURES> = {
    'dashboard': 'dashboard',
    'inventario': 'inventario',
    'productos': 'inventario',
    'ventas': 'ventas',
    'historial de ventas': 'historialVentas',
    'pos': 'pos',
    'punto de venta': 'pos',
    'caja': 'caja',
    'turnos': 'turnos',
    'reparaciones': 'repairs',
    'repairs': 'repairs',
    'clientes': 'clientes',
    'proveedores': 'proveedores',
    'categorías': 'categorias',
    'categorias': 'categorias',
    'sucursales': 'sucursales',
    'zonas de entrega': 'zonasEntrega',
    'delivery': 'zonasEntrega',
    'zonasEntrega': 'zonasEntrega',
    'solicitudes': 'solicitudes',
    'usuarios': 'usuarios',
    'roles': 'roles',
    'análisis de ventas': 'analisisVentas',
    'analisis de ventas': 'analisisVentas',
    'analisisVentas': 'analisisVentas',
    'reportes de inventario': 'reportesInventario',
    'reportesInventario': 'reportesInventario',
    'perfil': 'perfil',
    'mi perfil': 'perfil',
    'configuración usuario': 'configuracionUsuario',
    'configuracionUsuario': 'configuracionUsuario',
    'facturación': 'facturacion',
    'facturacion': 'facturacion',
    'configuración sistema': 'configuracionSistema',
    'configuracionSistema': 'configuracionSistema',
    'órdenes de compra': 'purchaseOrders',
    'ordenes de compra': 'purchaseOrders',
    'purchase orders': 'purchaseOrders',
    'purchaseOrders': 'purchaseOrders',
  };

  const normalizedModuleName = moduleName.toLowerCase().trim();
  
  // Buscar coincidencia exacta primero
  if (moduleToFeature[normalizedModuleName]) {
    return FEATURES[moduleToFeature[normalizedModuleName]];
  }

  // Buscar coincidencias parciales como fallback
  for (const [key, feature] of Object.entries(moduleToFeature)) {
    if (normalizedModuleName.includes(key) || key.includes(normalizedModuleName)) {
      return FEATURES[feature];
    }
  }

  // Si no encuentra coincidencia, mostrar por defecto (para módulos no mapeados)
  return true;
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
          console.error("Error fetching role data:", error);
          sileo.error({ title: "Error al cargar datos", description: "No se pudieron obtener los datos para el formulario de roles." });
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
  }, [roleId]); // Solo roleId como dependencia


  // --- Manejadores y Lógica del Formulario ---
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

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
      sileo.error({ title: "Validación fallida", description: "El nombre del rol es obligatorio." });
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
        await request({ method: 'PUT', url: `/roles/${roleId}/permissions`, data: payload });
        sileo.success({ title: "Rol actualizado con éxito." });
      } else {
        await request({ method: 'POST', url: '/roles', data: payload });
        sileo.success({ title: "Rol creado con éxito." });
      }
      navigate('/dashboard/roles');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Ocurrió un error inesperado.";
      sileo.error({ title: "Error al guardar", description: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.name, formData.description, formData.permissions, roleId]);

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
    <div className="flex flex-col h-full p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between flex-shrink-0">
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
      
      <div className="flex-1 overflow-y-auto min-h-0 py-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Información del Rol</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Rol</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} disabled={viewOnly || isSubmitting || isSystem} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} disabled={viewOnly || isSubmitting || isSystem} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permisos del Rol</CardTitle>
              <CardDescription>Selecciona los permisos para este rol. Solo se muestran los módulos habilitados en el sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {filteredModules.map((module) => (
                <div key={module.id} className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{formatPermissionName(module.name)}</h3>
                    <Checkbox
                      id={`module-${module.id}`}
                      checked={module.permissions.length > 0 && module.permissions.every((p) => formData.permissions.includes(p.id))}
                      onCheckedChange={(checked) => handleModuleToggle(module, !!checked)}
                      disabled={viewOnly || isSystem || isSubmitting}
                    />
                  </div>
                  {module.permissions.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="grid grid-cols-1 gap-4 pl-6 md:grid-cols-2 lg:grid-cols-3">
                        {module.permissions.map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between gap-2">
                            <Label htmlFor={`permission-${permission.id}`} className="text-sm font-normal" title={permission.description || formatPermissionName(permission.name)}>
                              {formatPermissionName(permission.name)}
                            </Label>
                            <Checkbox
                              id={`permission-${permission.id}`}
                              checked={formData.permissions.includes(permission.id)}
                              onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                              disabled={viewOnly || isSystem || isSubmitting}
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