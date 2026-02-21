import * as React from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface AutocompleteOption {
    value: string;
    label: string;
    [key: string]: any;
}

interface AutocompleteProps {
    options: AutocompleteOption[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    emptyText?: string;
    className?: string;
    inputClassName?: string;
    icon?: React.ReactNode;
}

export function Autocomplete({
    options,
    value,
    onValueChange,
    placeholder = "Buscar...",
    emptyText = "No se encontraron resultados.",
    className,
    inputClassName,
    icon = <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />,
}: AutocompleteProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Sync input value with selected value when initialized or changed externally
    React.useEffect(() => {
        if (value) {
            const selectedInfo = options.find((opt) => opt.value === value)
            if (selectedInfo) {
                setInputValue(selectedInfo.label)
            }
        } else {
            setInputValue("")
        }
    }, [value, options])

    const filteredOptions = React.useMemo(() => {
        if (!inputValue) return options;
        const search = inputValue.toLowerCase();
        return options.filter(option =>
            option.label.toLowerCase().includes(search)
        );
    }, [options, inputValue]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setInputValue(newValue)

        // Si hay un valor seleccionado y el usuario edita el texto (ya no coincide exactamente),
        // borramos la selección para que el sistema sepa que debe elegir de nuevo o está vacío.
        const currentSelectedOption = options.find(opt => opt.value === value)
        if (value && currentSelectedOption && currentSelectedOption.label !== newValue) {
            onValueChange('')
        } else if (newValue === '') {
            onValueChange('')
        }

        if (!open) setOpen(true)
    }

    const handleSelectOption = (optionValue: string, optionLabel: string) => {
        setInputValue(optionLabel)
        onValueChange(optionValue)
        setOpen(false)
        if (inputRef.current && typeof inputRef.current.blur === 'function') {
            inputRef.current.blur()
        }
    }

    return (
        <div className={cn("relative w-full", className)}>
            {icon}
            <Input
                ref={inputRef}
                placeholder={placeholder}
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => {
                    setOpen(true)
                }}
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false)
                }}
                className={cn(icon ? "pl-9" : "", inputClassName)}
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
            />

            {open && (
                <div className="absolute left-0 right-0 border rounded bg-white mt-1 max-h-40 overflow-auto z-50 shadow">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                className="p-2 cursor-pointer hover:bg-gray-100 text-sm"
                                role="button"
                                tabIndex={0}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleSelectOption(option.value, option.label)
                                }}
                            >
                                {option.label}
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                            {emptyText}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
