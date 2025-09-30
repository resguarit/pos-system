

import type { Dispatch, SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { NewProviderDialog } from "./new-provider-dialog"

export function NewProviderButton({ open, setOpen }: { open: boolean; setOpen: Dispatch<SetStateAction<boolean>>; }) {
  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Nuevo Proveedor
      </Button>
      <NewProviderDialog open={open} onOpenChange={setOpen} onSaved={() => {}} />
    </>
  )
}
