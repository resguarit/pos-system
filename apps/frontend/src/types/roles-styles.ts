// src/lib/role-styles.ts

import { Shield, User, ShoppingCart, UserCog } from "lucide-react"

// Definimos una interfaz para asegurar que siempre devolvemos el mismo tipo de objeto
interface RoleStyle {
  icon: React.ElementType
  color: string
}

/**
 * Devuelve el icono y el color de Tailwind CSS para un nombre de rol específico.
 * @param roleName - El nombre del rol (ej. "Admin", "Vendedor").
 * @returns Un objeto con el componente de icono y la clase de color.
 */
export const getRoleStyle = (roleName?: string): RoleStyle => {
  // Usamos un switch para manejar los diferentes roles que puedas tener.
  // Es insensible a mayúsculas/minúsculas.
  switch (roleName?.toLowerCase()) {
    case 'admin':
      return {
        icon: Shield,
        color: 'text-red-500', // Color para el rol de Admin
      }
    case 'vendedor':
      return {
        icon: ShoppingCart,
        color: 'text-blue-500', // Color para el rol de Vendedor
      }
    case 'gerente': // Ejemplo de otro rol que podrías tener
        return {
          icon: UserCog,
          color: 'text-green-500',
        }
    case 'supervisor':
      return {
        icon: UserCog,
        color: 'text-purple-500', // Color para el rol de Supervisor
      }
    default:
      // Un estilo por defecto para cualquier otro rol o si el rol no está definido
      return {
        icon: User,
        color: 'text-gray-500',
      }
  }
}