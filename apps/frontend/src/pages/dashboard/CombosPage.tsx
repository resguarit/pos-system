import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  TrendingUp,
  Star,
  Eye,
  DollarSign,
  Percent,
  ShoppingCart,
  AlertCircle
} from "lucide-react";
import { sileo } from "sileo"
import { ComboManagementDialog } from "@/components/ComboManagementDialog";
import { ComboDetailsDialog } from "@/components/ComboDetailsDialog";
import { DeleteComboDialog } from "@/components/DeleteComboDialog";
import { getAllCombos, calculateComboPrice } from "@/lib/api/comboService";
import type { Combo } from "@/types/combo";
import { useAuth } from "@/context/AuthContext";

export default function CombosPage() {
  const { user } = useAuth();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboPrices, setComboPrices] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Cargar combos
  const loadCombos = async () => {
    try {
      setLoading(true);
      const combosData = await getAllCombos();
      setCombos(combosData);

      // Calcular precios para cada combo
      const pricesMap = new Map<number, number>();
      for (const combo of combosData) {
        try {
          const priceDetails = await calculateComboPrice(combo.id);
          pricesMap.set(combo.id, priceDetails.final_price);
        } catch (error) {
          console.error(`Error calculating price for combo ${combo.id}:`, error);
        }
      }
      setComboPrices(pricesMap);
    } catch (error) {
      console.error("Error loading combos:", error);
      sileo.error({ title: "Error al cargar combos" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCombos();
  }, []);

  // Filtrar combos por término de búsqueda
  const filteredCombos = combos.filter(combo =>
    combo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    combo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Manejar creación de combo
  const handleCreateCombo = () => {
    setSelectedCombo(null);
    setShowCreateDialog(true);
  };

  // Manejar edición de combo
  const handleEditCombo = (combo: Combo) => {
    setSelectedCombo(combo);
    setShowEditDialog(true);
  };

  // Manejar ver detalles
  const handleViewDetails = (combo: Combo) => {
    setSelectedCombo(combo);
    setShowDetailsDialog(true);
  };

  // Manejar eliminación
  const handleDeleteCombo = (combo: Combo) => {
    setSelectedCombo(combo);
    setShowDeleteDialog(true);
  };

  // Obtener icono según tipo de descuento
  const getDiscountIcon = (combo: Combo) => {
    if (combo.discount_type === 'percentage') {
      return <Percent className="h-4 w-4" />;
    }
    return <DollarSign className="h-4 w-4" />;
  };

  // Obtener badge variant según descuento
  const getDiscountBadgeVariant = (combo: Combo) => {
    if (combo.discount_type === 'percentage' && combo.discount_value >= 20) {
      return 'destructive';
    } else if (combo.discount_type === 'percentage' && combo.discount_value >= 10) {
      return 'default';
    }
    return 'secondary';
  };

  // Obtener icono de combo según descuento
  const getComboIcon = (combo: Combo) => {
    if (combo.discount_type === 'percentage' && combo.discount_value >= 20) {
      return <TrendingUp className="h-5 w-5 text-red-500" />;
    } else if (combo.discount_type === 'percentage' && combo.discount_value >= 10) {
      return <Star className="h-5 w-5 text-blue-500" />;
    }
    return <Package className="h-5 w-5 text-indigo-500" />;
  };

  // Formatear descuento
  const formatDiscount = (combo: Combo) => {
    if (combo.discount_type === 'percentage') {
      return `${combo.discount_value}% OFF`;
    }
    return `$${combo.discount_value} OFF`;
  };

  // Verificar permisos específicos de combos
  const canManageCombos = user?.permissions?.some(p =>
    p === 'gestionar_combos' || p === 'administrar_sistema'
  );

  const canCreateCombos = user?.permissions?.some(p =>
    p === 'crear_combos' || p === 'administrar_sistema'
  );

  const canEditCombos = user?.permissions?.some(p =>
    p === 'editar_combos' || p === 'administrar_sistema'
  );

  const canDeleteCombos = user?.permissions?.some(p =>
    p === 'eliminar_combos' || p === 'administrar_sistema'
  );

  if (!canManageCombos) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acceso Denegado
          </h2>
          <p className="text-gray-600">
            No tienes permisos para gestionar combos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Combos
          </h1>
          <p className="text-gray-600 mt-1">
            Crea y gestiona combos de productos para aumentar las ventas
          </p>
        </div>
        {canCreateCombos && (
          <Button
            onClick={handleCreateCombo}
            variant="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Combo
          </Button>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Combos</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{combos.length}</div>
            <p className="text-xs text-muted-foreground">Combos creados en total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alto Descuento</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {combos.filter(c => c.discount_type === 'percentage' && c.discount_value >= 20).length}
            </div>
            <p className="text-xs text-muted-foreground">Combos con descuento ≥20%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medio Descuento</CardTitle>
            <Star className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {combos.filter(c => c.discount_type === 'percentage' && c.discount_value >= 10 && c.discount_value < 20).length}
            </div>
            <p className="text-xs text-muted-foreground">Combos con descuento 10-19%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {combos.filter(c => c.is_active === true).length}
            </div>
            <p className="text-xs text-muted-foreground">Combos disponibles para venta</p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar combos por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de combos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Combos ({filteredCombos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCombos.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron combos' : 'No hay combos creados'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Crea tu primer combo para empezar a aumentar las ventas'
                }
              </p>
              {!searchTerm && canCreateCombos && (
                <Button onClick={handleCreateCombo}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Combo
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCombos.map((combo) => (
                <Card
                  key={combo.id}
                  className="group hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-blue-200"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getComboIcon(combo)}
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                          {combo.name}
                        </h3>
                      </div>
                      <Badge
                        variant={getDiscountBadgeVariant(combo)}
                        className="flex items-center gap-1"
                      >
                        {getDiscountIcon(combo)}
                        {formatDiscount(combo)}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {combo.description || 'Sin descripción'}
                    </p>

                    {/* Precio del combo */}
                    {comboPrices.has(combo.id) && (
                      <div className="mb-3">
                        <span className="text-xl font-bold text-blue-600">
                          {formatCurrency(comboPrices.get(combo.id)!).replace(' ARS', '')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600 font-medium">
                        {combo.combo_items?.length || 0} productos incluidos
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 hover:border-blue-300"
                        onClick={() => handleViewDetails(combo)}
                      >
                        <Eye className="h-3 w-3 lg:mr-1" />
                        <span className="hidden lg:inline">Ver</span>
                      </Button>
                      {canEditCombos && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-orange-500 hover:text-orange-700 hover:bg-orange-50 border border-orange-200 hover:border-orange-300"
                          onClick={() => handleEditCombo(combo)}
                        >
                          <Edit className="h-3 w-3 lg:mr-1" />
                          <span className="hidden lg:inline">Editar</span>
                        </Button>
                      )}
                      {canDeleteCombos && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300"
                          onClick={() => handleDeleteCombo(combo)}
                        >
                          <Trash2 className="h-3 w-3 lg:mr-1" />
                          <span className="hidden lg:inline">Eliminar</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      <ComboManagementDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        combo={selectedCombo}
        onSaved={() => {
          setShowCreateDialog(false);
          loadCombos();
        }}
      />

      <ComboManagementDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        combo={selectedCombo}
        onSaved={() => {
          setShowEditDialog(false);
          loadCombos();
        }}
      />

      <ComboDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        combo={selectedCombo}
        formatCurrency={(amount) => `$${amount.toFixed(2)}`}
      />

      <DeleteComboDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        combo={selectedCombo}
        onDeleted={() => {
          setShowDeleteDialog(false);
          loadCombos();
        }}
      />
    </div>
  );
}
