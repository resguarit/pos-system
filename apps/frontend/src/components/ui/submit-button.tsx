import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { forwardRef } from "react"

interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean
  loadingText?: string
  children: React.ReactNode
}

export const SubmitButton = forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({ isLoading = false, loadingText = "Guardando...", children, disabled, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        type="submit"
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText}
          </>
        ) : (
          children
        )}
      </Button>
    )
  }
)

SubmitButton.displayName = "SubmitButton"




