import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShipmentStage, Role } from '@/types/shipment';
import { shipmentService } from '@/services/shipmentService';
import StageConfigurator from '@/components/shipments/StageConfigurator';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ShipmentStagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [stages, setStages] = useState<ShipmentStage[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const stagesResponse = await shipmentService.getStages();
      setStages(stagesResponse);

      // TODO: Fetch roles from a roles service when available
      // For now, we'll use mock data
      setRoles([
        { id: 1, name: 'admin', description: 'Administrator', active: true },
        { id: 2, name: 'logistics_manager', description: 'Logistics Manager', active: true },
        { id: 3, name: 'driver', description: 'Driver', active: true },
        { id: 4, name: 'warehouse_operator', description: 'Warehouse Operator', active: true },
      ]);
    } catch (err) {
      setError('Error al cargar las etapas');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = () => {
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/dashboard/envios')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuración de Etapas</h1>
            <p className="mt-2 text-gray-600">
              Configura las etapas del proceso de envío y sus reglas de visibilidad
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Stage Configurator */}
        <StageConfigurator
          stages={stages}
          roles={roles}
          onStageUpdate={handleStageUpdate}
        />

        {/* Information Panel */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Información sobre las Etapas
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              • Las etapas definen el flujo de trabajo de los envíos
            </p>
            <p>
              • El campo "Orden" determina la secuencia de las etapas
            </p>
            <p>
              • La configuración permite personalizar colores e iconos para cada etapa
            </p>
            <p>
              • Las reglas de visibilidad controlan qué información puede ver cada rol en cada etapa
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentStagesPage;
