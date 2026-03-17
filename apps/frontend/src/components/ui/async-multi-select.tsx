import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export type Option = {
    label: string
    value: string
}

const EMPTY_LABEL_MAP: Record<string, string> = {}

interface AsyncMultiSelectProps {
    options: Option[]
    selected: string[]
    onChange: (selected: string[]) => void
    onSearch: (query: string) => void
    loading?: boolean
    hasMore?: boolean
    onLoadMore?: () => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    className?: string
    disabled?: boolean
    // Map to keep track of labels for selected items even if they are not in the current options
    selectedLabelMap?: Record<string, string>
    minSearchLength?: number
}

export function AsyncMultiSelect({
    options,
    selected,
    onChange,
    onSearch,
    loading = false,
    hasMore = false,
    onLoadMore,
    placeholder = "Seleccionar...",
    searchPlaceholder = "Buscar...",
    emptyMessage = "No se encontraron resultados.",
    className,
    disabled = false,
    selectedLabelMap = EMPTY_LABEL_MAP,
    minSearchLength = 2,
}: AsyncMultiSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")
    const listboxId = React.useId()

    const handleUnselect = (item: string) => {
        onChange(selected.filter((i) => i !== item))
    }

    // Effect for debouncing local input state to parent onSearch
    React.useEffect(() => {
        if (!open) return

        const timer = setTimeout(() => {
            onSearch(inputValue)
        }, 300)
        return () => clearTimeout(timer)
    }, [inputValue, onSearch, open])

    // Effect to reset input when closed
    React.useEffect(() => {
        if (!open) {
            setInputValue("")
        }
    }, [open])

    // Combines options and selectedLabelMap to get displaying labels
    const getSelectedLabel = (value: string) => {
        const opt = options.find((o) => o.value === value)
        if (opt) return opt.label
        return selectedLabelMap[value] || `Item ${value}`
    }

    const buildSearchValue = (value: string, label: string) => `${label} ${value}`

    const trimmedInputValue = inputValue.trim()

    const unselectedOptions = React.useMemo(
        () => options.filter((opt) => !selected.includes(opt.value)),
        [options, selected]
    )

    const showMinLengthHint = trimmedInputValue.length > 0 && trimmedInputValue.length < minSearchLength
    const hasVisibleOptions = selected.length > 0 || unselectedOptions.length > 0

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listboxId}
                    className={cn("w-full justify-between hover:bg-background/90 min-h-10 h-auto px-3 py-2", className)}
                    disabled={disabled}
                >
                    <div className="flex flex-wrap gap-1 items-center w-full max-w-full overflow-hidden">
                        {selected.length === 0 && <span className="text-muted-foreground font-normal truncate">{placeholder}</span>}
                        {selected.length === 1 && (
                            <span className="truncate">{getSelectedLabel(selected[0])}</span>
                        )}
                        {selected.length > 1 && (
                            <span className="truncate font-medium">{selected.length} seleccionados</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-none" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList id={listboxId} className="max-h-64 overflow-y-auto">
                        {!hasVisibleOptions && (
                            <CommandEmpty>
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Buscando productos...</span>
                                    </div>
                                ) : showMinLengthHint ? (
                                    `Escribi al menos ${minSearchLength} caracteres para buscar.`
                                ) : (
                                    emptyMessage
                                )}
                            </CommandEmpty>
                        )}
                        <CommandGroup>
                            {/* Always show selected items at top if they don't match or even if they do */}
                            {selected.map((value) => {
                                const label = getSelectedLabel(value)
                                return (
                                    <CommandItem
                                        key={`selected-${value}`}
                                        value={buildSearchValue(value, label)}
                                        onSelect={() => handleUnselect(value)}
                                        className="font-medium bg-blue-50/50 cursor-pointer"
                                    >
                                        <div className="mr-2 h-4 w-4 flex items-center justify-center rounded border bg-primary border-primary text-primary-foreground">
                                            <Check className="h-3 w-3" />
                                        </div>
                                        <span className="truncate text-primary">{label}</span>
                                    </CommandItem>
                                )
                            })}

                            {/* Render options that are NOT selected */}
                            {unselectedOptions.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={buildSearchValue(option.value, option.label)}
                                    onSelect={() => {
                                        onChange([...selected, option.value])
                                    }}
                                    className="cursor-pointer"
                                >
                                    <div className="mr-2 h-4 w-4 flex items-center justify-center rounded border border-input">
                                    </div>
                                    <span className="truncate">{option.label}</span>
                                </CommandItem>
                            ))}

                            {hasMore && (
                                <CommandItem
                                    className="justify-center text-muted-foreground cursor-pointer mt-2 border-t pt-2"
                                    onSelect={() => {
                                        if (onLoadMore) onLoadMore()
                                    }}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cargar más..."}
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
