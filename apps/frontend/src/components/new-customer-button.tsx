

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import NewCustomerDialog from "./new-customer-dialog"

export function NewCustomerButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Nuevo Cliente
      </Button>
      <NewCustomerDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
