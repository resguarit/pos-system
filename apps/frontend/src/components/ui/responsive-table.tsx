import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ResponsiveTableProps {
  children: ReactNode
  className?: string
}

interface ResponsiveTableHeaderProps {
  children: ReactNode
  className?: string
}

interface ResponsiveTableBodyProps {
  children: ReactNode
  className?: string
}

interface ResponsiveTableRowProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

interface ResponsiveTableCellProps {
  children: ReactNode
  className?: string
  header?: boolean
}

interface ResponsiveTableMobileCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className={cn("w-full border-collapse", className)}>
          {children}
        </table>
      </div>
      
      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {children}
      </div>
    </div>
  )
}

export function ResponsiveTableHeader({ children, className }: ResponsiveTableHeaderProps) {
  return (
    <>
      {/* Desktop Header */}
      <thead className={cn("bg-gray-50", className)}>
        {children}
      </thead>
    </>
  )
}

export function ResponsiveTableBody({ children, className }: ResponsiveTableBodyProps) {
  return (
    <>
      {/* Desktop Body */}
      <tbody className={cn("divide-y divide-gray-200", className)}>
        {children}
      </tbody>
    </>
  )
}

export function ResponsiveTableRow({ children, className, onClick }: ResponsiveTableRowProps) {
  return (
    <>
      {/* Desktop Row */}
      <tr 
        className={cn(
          "hover:bg-gray-50 transition-colors",
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        {children}
      </tr>
    </>
  )
}

export function ResponsiveTableCell({ 
  children, 
  className, 
  header = false
}: ResponsiveTableCellProps) {
  const Component = header ? "th" : "td"
  
  return (
    <Component 
      className={cn(
        header 
          ? "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          : "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
        className
      )}
    >
      {children}
    </Component>
  )
}

export function ResponsiveTableMobileCard({ children, className, onClick }: ResponsiveTableMobileCardProps) {
  return (
    <div 
      className={cn(
        "bg-white border border-gray-200 rounded-lg p-4 shadow-sm",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// Componente helper para crear cards móviles
export function MobileCardField({ label, value, className }: { 
  label: string
  value: ReactNode
  className?: string 
}) {
  return (
    <div className={cn("flex justify-between items-center py-1", className)}>
      <span className="text-sm font-medium text-gray-500">{label}:</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  )
}

// Componente para acciones en móviles
export function MobileCardActions({ children, className }: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <div className={cn("flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100", className)}>
      {children}
    </div>
  )
}


