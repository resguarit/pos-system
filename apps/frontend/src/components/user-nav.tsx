import { LogOut, Type } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/AuthContext"
import { sileo } from "sileo"

export function UserNav() {
  const { user, logout, updateFontScale } = useAuth()

  const displayName = user?.username || user?.email || "Usuario"
  const displayEmail = user?.email || ""

  const getInitials = (text: string) => {
    if (!text) return "US"
    const base = text.includes("@") ? text.split("@")[0] : text
    const parts = base.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return base.slice(0, 2).toUpperCase()
  }

  const selectedFontScale = String(user?.font_scale ?? 1)

  const handleFontScaleChange = async (value: string) => {
    const scale = Number(value)
    if (Number.isNaN(scale)) return

    // Apply immediately for better UX while persisting in backend.
    document.documentElement.style.setProperty("--app-font-scale", String(scale))

    try {
      await updateFontScale(scale)
    } catch (error) {
      sileo.error({ title: "No se pudo guardar el tamaño de letra" })
      document.documentElement.style.setProperty("--app-font-scale", String(user?.font_scale ?? 1))
      console.error(error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="cursor-pointer">
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-user.jpg" alt={displayName} />
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {displayEmail && (
              <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Type className="h-3.5 w-3.5" />
            <span>Tamaño de letra</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={selectedFontScale} onValueChange={handleFontScaleChange}>
          <DropdownMenuRadioItem value="0.9">Pequeña</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="1">Normal</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="1.1">Grande</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
