import { CheckCircle2, Circle } from "lucide-react"

export type ShippingStage = {
  id: string
  name: string
  color: string
  completed: boolean
}

interface ShippingFlowVisualizationProps {
  stages: ShippingStage[]
  onToggleComplete?: (id: string) => void
}

export const ShippingFlowVisualization = ({ stages, onToggleComplete }: ShippingFlowVisualizationProps) => {
  return (
    <div className="flex items-center justify-between gap-4 p-6 bg-muted/20 rounded-lg overflow-x-auto">
      {stages.map((stage, index) => (
        <div key={stage.id} className="flex items-center flex-1 min-w-[140px]">
          <div className="flex flex-col items-center flex-1">
            <button
              onClick={() => onToggleComplete?.(stage.id)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                onToggleComplete ? 'cursor-pointer hover:scale-110' : ''
              }`}
              style={{
                backgroundColor: stage.completed ? stage.color : `${stage.color}20`,
                border: `3px solid ${stage.color}`,
              }}
              aria-label={`${stage.completed ? 'Marcar como incompleta' : 'Marcar como completa'}: ${stage.name}`}
            >
              {stage.completed ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <Circle className="w-4 h-4" style={{ color: stage.color }} />
              )}
            </button>
            <p className="font-medium text-foreground text-sm mt-3 text-center">{stage.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stage.completed ? 'Completada' : 'Pendiente'}
            </p>
          </div>
          {index < stages.length - 1 && (
            <div
              className="flex-1 h-1 mx-3 min-w-[50px] rounded-full transition-all"
              style={{
                backgroundColor: stage.completed && stages[index + 1].completed 
                  ? stage.color 
                  : `${stage.color}40`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
