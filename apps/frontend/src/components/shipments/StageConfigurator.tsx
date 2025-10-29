import React from 'react';
import { ShipmentStage, Role } from '@/types/shipment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StageConfiguratorProps {
  stages: ShipmentStage[];
  roles: Role[];
  onStageUpdate: () => void;
}

const StageConfigurator: React.FC<StageConfiguratorProps> = ({ stages, roles, onStageUpdate }) => {
  return (
    <div className="space-y-4">
      {stages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No hay etapas configuradas</p>
            <Button className="mt-4" onClick={onStageUpdate}>
              Recargar
            </Button>
          </CardContent>
        </Card>
      ) : (
        stages.map((stage) => (
          <Card key={stage.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {stage.name}
                  <Badge variant={stage.is_active ? "default" : "secondary"}>
                    {stage.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                  <Badge variant="outline">Orden: {stage.order}</Badge>
                </CardTitle>
              </div>
              {stage.description && (
                <p className="text-sm text-gray-600 mt-2">{stage.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stage.config && typeof stage.config === 'object' && Object.keys(stage.config).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Configuración:</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(stage.config, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Creada: {new Date(stage.created_at).toLocaleDateString()}
                  {stage.updated_at && (
                    <> • Actualizada: {new Date(stage.updated_at).toLocaleDateString()}</>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default StageConfigurator;

