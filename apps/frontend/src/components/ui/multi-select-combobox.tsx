
import * as React from "react"
import { ChevronDown, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Badge } from "@/components/ui/badge"

export type Option = {
    label: string
    value: string
}

interface MultiSelectComboboxProps {
    options: Option[]
    selected: string[]
    onChange: (selected: string[]) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    className?: string
    disabled?: boolean
    maxSelected?: number
    onMaxSelected?: () => void
    /** If false, selected items won't render as badges in the trigger. */
    showSelectedBadges?: boolean
    /** When badges are hidden, show "N seleccionados" (or a custom function). */
    selectedSummary?: (count: number) => string
    /** Match Select-style chevron (e.g. filter rows next to native Selects). */
    triggerIcon?: "chevrons" | "chevron-down"
    /** Accessible name when there is no visible label. */
    "aria-label"?: string
}

export function MultiSelectCombobox({
    options,
    selected,
    onChange,
    placeholder = "Select items...",
    searchPlaceholder = "Search...",
    emptyMessage = "No item found.",
    className,
    disabled = false,
    maxSelected,
    onMaxSelected,
    showSelectedBadges = true,
    selectedSummary,
    triggerIcon = "chevrons",
    "aria-label": ariaLabel,
}: MultiSelectComboboxProps) {
    const [open, setOpen] = React.useState(false)

    const handleUnselect = (item: string) => {
        onChange(selected.filter((i) => i !== item))
    }

    const selectedOptions = selected
        .map((value) => options.find((opt) => opt.value === value))
        .filter(Boolean) as Option[]

    const summaryText = React.useMemo(() => {
        if (selected.length === 0) return ""
        if (selectedSummary) return selectedSummary(selected.length)
        return `${selected.length} seleccionados`
    }, [selected.length, selectedSummary])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-label={ariaLabel}
                    className={cn(
                        "w-full justify-between items-center hover:bg-background/90 h-auto min-h-10 px-3 py-2 text-left font-normal",
                        className
                    )}
                    disabled={disabled}
                >
                    <div className="flex flex-wrap gap-1 items-center w-full">
                        {selected.length === 0 && (
                            <span className="text-muted-foreground font-normal">{placeholder}</span>
                        )}
                        {selected.length > 0 && !showSelectedBadges && (
                            <span className="text-muted-foreground font-normal">{summaryText}</span>
                        )}
                        {showSelectedBadges &&
                            selectedOptions.map((option) => (
                                <Badge
                                    variant="secondary"
                                    key={option.value}
                                    className="mr-1 mb-0.5 mt-0.5"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleUnselect(option.value)
                                    }}
                                >
                                    {option.label}
                                    <div
                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleUnselect(option.value)
                                            }
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleUnselect(option.value)
                                        }}
                                    >
                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                    </div>
                                </Badge>
                            ))}
                    </div>
                    {triggerIcon === "chevron-down" ? (
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    className="min-w-0"
                                    onSelect={() => {
                                        if (selected.includes(option.value)) {
                                            onChange(selected.filter((item) => item !== option.value))
                                        } else {
                                            if (maxSelected && selected.length >= maxSelected) {
                                                onMaxSelected?.()
                                            } else {
                                                onChange([...selected, option.value])
                                            }
                                        }
                                    }}
                                >
                                    <Checkbox
                                        checked={selected.includes(option.value)}
                                        className="mr-2 pointer-events-none"
                                        aria-hidden="true"
                                        tabIndex={-1}
                                    />
                                    <span className="min-w-0 truncate">{option.label}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
