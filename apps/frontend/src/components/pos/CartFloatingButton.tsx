import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart } from "lucide-react"
import { usePrimaryColor } from "@/hooks/usePrimaryColor"
import { cn } from "@/lib/utils"

const BUTTON_SIZE = 56 // px (equivalente a h-14 w-14)
const ICON_SIZE = 24 // px (equivalente a h-6 w-6)
const BADGE_SIZE = 24 // px (equivalente a h-6 w-6)

interface CartFloatingButtonProps {
  itemCount: number
  onClick: () => void
  className?: string
}

/**
 * Botón flotante del carrito para dispositivos móviles
 * Perfectamente circular, usa el color primario de la configuración
 */
export function CartFloatingButton({
  itemCount,
  onClick,
  className,
}: CartFloatingButtonProps) {
  const primaryColor = usePrimaryColor()

  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed bottom-4 right-4 lg:hidden",
        "rounded-full shadow-2xl z-40 text-white border-2",
        "backdrop-blur-none flex items-center justify-center",
        "aspect-square p-0",
        className
      )}
      style={{
        backgroundColor: primaryColor,
        opacity: 1,
        borderColor: primaryColor,
        borderRadius: '50%',
        width: `${BUTTON_SIZE}px`,
        height: `${BUTTON_SIZE}px`,
        minWidth: `${BUTTON_SIZE}px`,
        minHeight: `${BUTTON_SIZE}px`,
        boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 2px ${primaryColor}`,
      }}
      aria-label={`Carrito con ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
    >
      <ShoppingCart className="flex-shrink-0" style={{ width: `${ICON_SIZE}px`, height: `${ICON_SIZE}px` }} />
      {itemCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 rounded-full p-0 flex items-center justify-center text-xs font-bold"
          style={{
            width: `${BADGE_SIZE}px`,
            height: `${BADGE_SIZE}px`,
          }}
          aria-label={`${itemCount} ${itemCount === 1 ? 'artículo' : 'artículos'} en el carrito`}
        >
          {itemCount}
        </Badge>
      )}
    </Button>
  )
}



