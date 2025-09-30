

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { NewProductDialog } from "@/components/new-product-dialog"
import { Plus } from "lucide-react"

interface NewProductButtonProps {
  onProductCreated: () => void;
}

export function NewProductButton({ onProductCreated }: NewProductButtonProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false);
    onProductCreated();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2 h-10 px-4 py-2 min-w-[140px]">
        <Plus className="h-4 w-4" />
        Nuevo Producto
      </Button>
      <NewProductDialog open={open} onOpenChange={setOpen} onSuccess={handleSuccess} />
    </>
  )
}
