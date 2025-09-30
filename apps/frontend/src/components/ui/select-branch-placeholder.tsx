import { MapPin } from "lucide-react"

interface SelectBranchPlaceholderProps {
  title?: string
  description?: string
  className?: string
}

export default function SelectBranchPlaceholder({
  title = "Selecciona una sucursal",
  description = "Debes seleccionar una sucursal para poder usar el sistema.",
  className = ""
}: SelectBranchPlaceholderProps) {
  return (
    <div className={`flex items-center justify-center h-[calc(100vh-4rem)] ${className}`}>
      <div className="text-center">
        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-gray-600">
          {description}
        </p>
      </div>
    </div>
  )
}
