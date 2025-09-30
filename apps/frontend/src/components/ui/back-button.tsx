import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

interface BackButtonProps {
  to: string
  className?: string
}

export function BackButton({ to, className = "" }: BackButtonProps) {
  return (
    <Link to={to}>
      <Button
        variant="ghost"
        className={`flex items-center gap-2 ${className}`}
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Button>
    </Link>
  )
}