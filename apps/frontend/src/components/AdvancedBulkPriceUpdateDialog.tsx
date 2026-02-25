import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { bulkPriceService } from '@/lib/api/bulkPriceService';
import { sileo } from "sileo"
import { ErrorBoundary } from './ErrorBoundary';

interface AdvancedBulkPriceUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPricesUpdated?: () => void;
}

export const AdvancedBulkPriceUpdateDialog: React.FC<AdvancedBulkPriceUpdateDialogProps> = ({
  open,
  onOpenChange,
  onPricesUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    search: boolean | null;
    stats: boolean | null;
  }>({ search: null, stats: null });

  const handleClose = () => {
    setTestResults({ search: null, stats: null });
    onOpenChange(false);
  };

  const testEndpoints = async () => {
    setLoading(true);
    setTestResults({ search: null, stats: null });

    try {
      // Test search endpoint
      try {
        await bulkPriceService.searchProducts({ page: 1, per_page: 10 });
        setTestResults(prev => ({ ...prev, search: true }));
        sileo.success({ title: '✅ Endpoint de búsqueda funciona correctamente' });
      } catch (error: any) {
        setTestResults(prev => ({ ...prev, search: false }));
        sileo.error({ title: `❌ Error en endpoint de búsqueda: ${error.message || 'Error desconocido'}` });
        console.error('Search error:', error);
      }

      // Test stats endpoint
      try {
        await bulkPriceService.getStats({});
        setTestResults(prev => ({ ...prev, stats: true }));
        sileo.success({ title: '✅ Endpoint de estadísticas funciona correctamente' });
      } catch (error: any) {
        setTestResults(prev => ({ ...prev, stats: false }));
        sileo.error({ title: `❌ Error en endpoint de estadísticas: ${error.message || 'Error desconocido'}` });
        console.error('Stats error:', error);
      }

    } catch (error: any) {
      console.error('Error general en testEndpoints:', error);
      sileo.error({ title: '❌ Error general al probar endpoints' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      testEndpoints();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <ErrorBoundary>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Prueba de Endpoints - Actualización Masiva de Precios
            </DialogTitle>
            <DialogDescription>
              Verificación de conectividad y funcionamiento de los endpoints del sistema de actualización masiva.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado de Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Búsqueda de Productos</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">/products/search_for_bulk_update</code>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.search === null && <Loader2 className="h-4 w-4 animate-spin" />}
                  {testResults.search === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {testResults.search === false && <XCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">
                    {testResults.search === null && 'Probando...'}
                    {testResults.search === true && 'Funcionando'}
                    {testResults.search === false && 'Error'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Estadísticas</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">/products/bulk_update_stats</code>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.stats === null && <Loader2 className="h-4 w-4 animate-spin" />}
                  {testResults.stats === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {testResults.stats === false && <XCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">
                    {testResults.stats === null && 'Probando...'}
                    {testResults.stats === true && 'Funcionando'}
                    {testResults.stats === false && 'Error'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button 
              onClick={testEndpoints} 
              disabled={loading}
              className="flex gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Probar Nuevamente
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cerrar
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>• <strong>Autenticación:</strong> Requerida para todos los endpoints</p>
              <p>• <strong>Base URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}</p>
              <p>• <strong>Método:</strong> GET para búsqueda y estadísticas</p>
              <p>• <strong>Formato:</strong> JSON con paginación</p>
            </CardContent>
          </Card>
        </div>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
};