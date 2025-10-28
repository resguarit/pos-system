/**
 * EJEMPLO DE INTEGRACIÓN
 * 
 * Este archivo muestra cómo integrar el sistema de actualización masiva de precios
 * en tu aplicación. Copia y adapta este código según tus necesidades.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { BulkPriceUpdateModal } from '@/components/BulkPriceUpdate';

/**
 * Ejemplo 1: Integración básica en página de inventario
 */
export function InventoryPageExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSuccess = () => {
    // Refrescar la lista de productos después de actualizar
    console.log('Precios actualizados exitosamente');
    // Aquí puedes llamar a tu función de refetch o actualización de datos
    // Por ejemplo: refetchProducts();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
        
        {/* Botón para abrir el modal de actualización masiva */}
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Actualizar Precios Masivamente
        </Button>
      </div>

      {/* Tu contenido de inventario aquí */}
      <div className="grid grid-cols-1 gap-4">
        {/* Lista de productos, tabla, etc. */}
      </div>

      {/* Modal de actualización masiva */}
      <BulkPriceUpdateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

/**
 * Ejemplo 2: Integración con React Query
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProducts } from '@/lib/api/productService';

export function InventoryWithReactQueryExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Query para obtener productos
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const handleSuccess = () => {
    // Invalidar y refrescar la query de productos
    queryClient.invalidateQueries({ queryKey: ['products'] });
    
    // Mostrar notificación de éxito
    console.log('Precios actualizados y datos refrescados');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
        
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Actualizar Precios
        </Button>
      </div>

      {isLoading ? (
        <div>Cargando productos...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* Renderizar productos */}
        </div>
      )}

      <BulkPriceUpdateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

/**
 * Ejemplo 3: Integración con permisos de usuario
 */
export function InventoryWithPermissionsExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Supongamos que tienes un hook para verificar permisos
  const { hasPermission } = useUserPermissions();
  const canUpdatePrices = hasPermission('update_prices');

  const handleSuccess = () => {
    // Lógica después de actualizar
    console.log('Precios actualizados');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
        
        {/* Solo mostrar el botón si el usuario tiene permisos */}
        {canUpdatePrices && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Actualizar Precios
          </Button>
        )}
      </div>

      {/* Contenido */}

      {canUpdatePrices && (
        <BulkPriceUpdateModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

/**
 * Ejemplo 4: Integración con múltiples callbacks
 */
export function InventoryWithCallbacksExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleSuccess = () => {
    // Actualizar timestamp de última actualización
    setLastUpdate(new Date());
    
    // Refrescar datos
    refreshInventory();
    
    // Registrar en analytics
    trackEvent('bulk_price_update_success');
    
    // Mostrar notificación
    showSuccessNotification('Precios actualizados correctamente');
  };

  const refreshInventory = () => {
    // Tu lógica de refresh
  };

  const trackEvent = (eventName: string) => {
    // Tu lógica de analytics
  };

  const showSuccessNotification = (message: string) => {
    // Tu lógica de notificaciones
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          {lastUpdate && (
            <p className="text-sm text-gray-500">
              Última actualización: {lastUpdate.toLocaleString()}
            </p>
          )}
        </div>
        
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Actualizar Precios
        </Button>
      </div>

      {/* Contenido */}

      <BulkPriceUpdateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

/**
 * Hook personalizado para simplificar la integración
 */
export function useBulkPriceUpdateModal(onSuccess?: () => void) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const handleSuccess = () => {
    onSuccess?.();
    close();
  };

  return {
    isOpen,
    open,
    close,
    handleSuccess,
    Modal: () => (
      <BulkPriceUpdateModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onSuccess={handleSuccess}
      />
    ),
  };
}

/**
 * Ejemplo 5: Usando el hook personalizado
 */
export function InventoryWithCustomHookExample() {
  const { open, Modal } = useBulkPriceUpdateModal(() => {
    console.log('Precios actualizados');
    // Refrescar datos
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
        
        <Button onClick={open} className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Actualizar Precios
        </Button>
      </div>

      {/* Contenido */}

      <Modal />
    </div>
  );
}

// Mock de hook de permisos para el ejemplo
function useUserPermissions() {
  return {
    hasPermission: (permission: string) => true,
  };
}
