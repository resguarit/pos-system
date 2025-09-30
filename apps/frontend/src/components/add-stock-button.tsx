

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PackagePlus } from "lucide-react"
import { AddStockDialog } from "@/components/add-stock-dialog"
import type { Branch } from "@/types/product"

interface AddStockButtonProps {
  branches: Branch[]
  onStockAdded: () => void
  onClick?: () => void | Promise<void>
}

export function AddStockButton({ branches, onStockAdded, onClick }: AddStockButtonProps) {
  const [open, setOpen] = useState(false)

  const handleClick = async () => {
    if (onClick) {
      await onClick()
    }
    setOpen(true)
  }

  return (
    <>
      <Button onClick={handleClick} variant="outline" className="gap-2 h-10 px-4 py-2 min-w-[140px]">
        <PackagePlus className="h-4 w-4" />
        Ajustar Stock
      </Button>
      <AddStockDialog open={open} onOpenChange={setOpen} onSuccess={onStockAdded} branches={branches} />
    </>
  )
}
