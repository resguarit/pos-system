import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FEATURES } from '@/config/features';
import { 
  User,
  Shield, 
  Building2, 
  CheckCircle, 
  Eye,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface UserPermissionsDisplayProps {
  showFullInfo?: boolean;
  className?: string;
}

export function UserPermissionsDisplay({ 
  showFullInfo = false, 
  className = '' 
}: UserPermissionsDisplayProps) {
  const { 
    user, 
    permissions, 
    branches, 
    currentBranch, 
    isAdmin, 
    getUserDisplayName 
  } = useAuth();

  if (!user) {
    return null;
  }

  const groupPermissionsByModule = () => {
    const grouped: Record<string, string[]> = {};
    permissions.forEach(permission => {
      // Extraer el módulo del nombre del permiso (por ejemplo: "ver_productos" -> "productos")
      const parts = permission.split('_');
      if (parts.length >= 2) {
        const module = parts.slice(1).join('_');
        if (!grouped[module]) {
          grouped[module] = [];
        }
        grouped[module].push(permission);
      } else {
        if (!grouped['general']) {
          grouped['general'] = [];
        }
        grouped['general'].push(permission);
      }
    });
    return grouped;
  };

  // Filtrar módulos según features habilitadas
  const filterModulesByFeatures = (groupedPermissions: Record<string, string[]>) => {
    const moduleFeatureMap: Record<string, keyof typeof FEATURES> = {
      'dashboard': 'dashboard',
      'ventas': 'ventas',
      'productos': 'inventario',
      'categorias': 'inventario',
      'inventario': 'inventario',
      'usuarios': 'usuarios',
      'roles': 'roles',
      'sucursales': 'sucursales',
      'clientes': 'clientes',
      'compras': 'purchaseOrders',
      'proveedores': 'proveedores',
      'caja': 'caja',
      'reportes': 'analisisVentas', // Se mostrará si cualquier reporte está habilitado
      'fiscal': 'configuracionSistema',
      'configuracion': 'configuracionSistema',
      'auditoria': 'configuracionSistema',
      'repairs': 'repairs',
      'turnos': 'turnos',
      'zonas_entrega': 'zonasEntrega',
      'solicitudes': 'solicitudes',
      'facturacion': 'facturacion'
    };

    const filtered: Record<string, string[]> = {};
    
    Object.entries(groupedPermissions).forEach(([module, perms]) => {
      const featureKey = moduleFeatureMap[module];
      
      // Si el módulo es 'general' o no tiene feature asociada, siempre lo mostramos
      if (module === 'general' || !featureKey) {
        filtered[module] = perms;
        return;
      }

      // Para reportes, mostramos si algún tipo de reporte está habilitado
      if (module === 'reportes') {
        if (FEATURES.analisisVentas || FEATURES.reportesInventario) {
          filtered[module] = perms;
        }
        return;
      }

      // Para otros módulos, verificamos si la feature está habilitada
      if (FEATURES[featureKey]) {
        filtered[module] = perms;
      }
    });

    return filtered;
  };

  const getModuleDisplayName = (module: string) => {
    const moduleNames: Record<string, string> = {
      'dashboard': 'Panel Principal',
      'ventas': 'Ventas',
      'productos': 'Productos',
      'categorias': 'Categorías',
      'inventario': 'Inventario',
      'usuarios': 'Usuarios',
      'roles': 'Roles y Permisos',
      'sucursales': 'Sucursales',
      'clientes': 'Clientes',
      'compras': 'Compras',
      'proveedores': 'Proveedores',
      'metodos_pago': 'Métodos de Pago',
      'caja': 'Caja',
      'reportes': 'Reportes',
      'fiscal': 'Fiscal',
      'configuracion': 'Configuración',
      'auditoria': 'Auditoría',
      'general': 'General'
    };
    return moduleNames[module] || module.charAt(0).toUpperCase() + module.slice(1);
  };

  const getPermissionDisplayName = (permission: string) => {
    const permissionNames: Record<string, string> = {
      'ver_dashboard': 'Ver panel principal',
      'ver_estadisticas': 'Ver estadísticas',
      'ver_ventas': 'Ver ventas',
      'crear_ventas': 'Crear ventas',
      'anular_ventas': 'Anular ventas',
      'reimprimir_comprobantes': 'Reimprimir comprobantes',
      'aplicar_descuentos': 'Aplicar descuentos',
      'ver_productos': 'Ver productos',
      'crear_productos': 'Crear productos',
      'editar_productos': 'Editar productos',
      'eliminar_productos': 'Eliminar productos',
      'actualizar_stock': 'Actualizar stock',
      'abrir_caja': 'Abrir caja',
      'cerrar_caja': 'Cerrar caja',
    };
    return permissionNames[permission] || permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRoleBadge = () => {
    if (isAdmin()) {
      return <Badge className="bg-red-100 text-red-800 border-red-300">Administrador</Badge>;
    }
    
    return (
      <Badge variant="outline">
        {user.role?.name || 'Sin rol'}
      </Badge>
    );
  };

  const BasicInfo = () => (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{getUserDisplayName()}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        {getRoleBadge()}
      </div>

      {currentBranch && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{currentBranch.description}</span>
        </div>
      )}
    </div>
  );

  if (!showFullInfo) {
    return <BasicInfo />;
  }

  const groupedPermissions = groupPermissionsByModule();
  const filteredPermissions = filterModulesByFeatures(groupedPermissions);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Información del Usuario</span>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver permisos detallados
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Permisos y Accesos del Usuario</DialogTitle>
                </DialogHeader>
                <div className="h-[60vh] overflow-y-auto pr-4">
                  <div className="space-y-6">
                    {/* Información básica */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Información Personal</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Nombre: </span>
                            <span>{getUserDisplayName()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email: </span>
                            <span>{user.email}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Usuario: </span>
                            <span>{user.username}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Estado: </span>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Rol y Permisos</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Rol: </span>
                            {getRoleBadge()}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total de permisos: </span>
                            <Badge variant="outline">
                              {Object.values(filteredPermissions).flat().length}
                            </Badge>
                            {Object.values(filteredPermissions).flat().length < permissions.length && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({permissions.length - Object.values(filteredPermissions).flat().length} ocultos por features deshabilitadas)
                              </span>
                            )}
                          </div>
                          {isAdmin() && (
                            <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border">
                              <Settings className="h-3 w-3 inline mr-1" />
                              Como administrador, tienes acceso completo a todas las funciones del sistema.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Sucursales */}
                    <div>
                      <h4 className="font-medium mb-3">Sucursales Asignadas ({branches.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {branches.map(branch => (
                          <div 
                            key={branch.id} 
                            className={`p-3 border rounded-lg ${
                              currentBranch?.id === branch.id 
                                ? 'bg-blue-50 border-blue-300' 
                                : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {branch.color && (
                                <div 
                                  className="w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: branch.color }}
                                />
                              )}
                              <span className="font-medium text-sm">{branch.description}</span>
                              {currentBranch?.id === branch.id && (
                                <Badge variant="outline" className="text-xs">Actual</Badge>
                              )}
                            </div>
                            {branch.address && (
                              <p className="text-xs text-muted-foreground">{branch.address}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Permisos por módulo */}
                    <div>
                      <h4 className="font-medium mb-3">Permisos por Módulo</h4>
                      <div className="space-y-4">
                        {Object.entries(filteredPermissions).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No hay permisos disponibles para las funcionalidades habilitadas</p>
                          </div>
                        ) : (
                          <>
                            {Object.entries(filteredPermissions).map(([module, modulePermissions]) => (
                              <div key={module} className="border rounded-lg p-4">
                                <h5 className="font-medium mb-2 flex items-center gap-2">
                                  {getModuleDisplayName(module)}
                                  <Badge variant="outline" className="text-xs">
                                    {modulePermissions.length}
                                  </Badge>
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {modulePermissions.map(permission => (
                                    <div 
                                      key={permission}
                                      className="flex items-center gap-2 text-sm p-2 bg-green-50 rounded border-green-200"
                                    >
                                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                      <span className="text-green-800">{getPermissionDisplayName(permission)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            
                            {Object.values(filteredPermissions).flat().length < permissions.length && (
                              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <Settings className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                  <div className="text-sm">
                                    <p className="font-medium text-amber-800 mb-1">Permisos ocultos</p>
                                    <p className="text-amber-700">
                                      {permissions.length - Object.values(filteredPermissions).flat().length} permisos están ocultos 
                                      porque corresponden a funcionalidades deshabilitadas en el sistema.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BasicInfo />
        </CardContent>
      </Card>
    </div>
  );
}
