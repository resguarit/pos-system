import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type SupplierSearchItem = {
  id: number | string;
  name: string;
  phone?: string | null;
  email?: string | null;
  cuit?: string | null;
  contact_name?: string | null;
};

function itemMatchesQuery(item: SupplierSearchItem, q: string): boolean {
  const s = q.toLowerCase();
  if (item.name.toLowerCase().includes(s)) return true;
  if (item.contact_name && item.contact_name.toLowerCase().includes(s)) return true;
  if (item.phone && String(item.phone).toLowerCase().includes(s)) return true;
  if (item.email && item.email.toLowerCase().includes(s)) return true;
  if (item.cuit && String(item.cuit).toLowerCase().includes(s)) return true;
  return false;
}

export type SupplierSearchComboboxProps = {
  id?: string;
  label?: React.ReactNode;
  value: string;
  onValueChange: (supplierId: string) => void;
  suppliers: SupplierSearchItem[];
  /** Texto mostrado si aún no está el catálogo o el id no aparece en la lista (p. ej. product.supplier?.name) */
  valueLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  labelClassName?: string;
  error?: boolean;
  className?: string;
  /** Al borrar el texto del input se envía este id (p. ej. filtros con valor "all") */
  clearedValue?: string;
  endAdornment?: React.ReactNode;
  onInputKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

export function SupplierSearchCombobox({
  id,
  label,
  value,
  onValueChange,
  suppliers,
  valueLabel,
  disabled,
  placeholder = "Buscar por nombre, contacto, teléfono, email o CUIT...",
  labelClassName,
  error,
  className,
  clearedValue = "",
  endAdornment,
  onInputKeyDown,
}: SupplierSearchComboboxProps) {
  const [search, setSearch] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const suppliersRef = useRef(suppliers);
  suppliersRef.current = suppliers;

  /** Solo cambia cuando cambian los datos del catálogo, no por referencia nueva del array. */
  const catalogSignature = useMemo(
    () => suppliers.map((s) => `${String(s.id)}:${String(s.name ?? "")}`).join("\n"),
    [suppliers],
  );

  useEffect(() => {
    if (!value || value === clearedValue) {
      setSearch("");
      return;
    }
    const found = suppliersRef.current.find((x) => String(x.id) === String(value));
    setSearch(found?.name ?? valueLabel ?? "");
  }, [value, clearedValue, catalogSignature, valueLabel]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((c) => itemMatchesQuery(c, q));
  }, [suppliers, search]);

  const showDropdown = showOptions && !disabled && filtered.length > 0;

  const input = (
    <div className={cn("flex gap-2", className)}>
      <div className="relative z-[100] flex-1 isolate">
        <Input
          id={id}
          value={search}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            setSearch(v);
            setShowOptions(true);
            if (!v) {
              onValueChange(clearedValue);
            }
          }}
          onFocus={() => setShowOptions(true)}
          onBlur={() => setTimeout(() => setShowOptions(false), 200)}
          onKeyDown={onInputKeyDown}
          placeholder={placeholder}
          className={cn(error && "border-red-500")}
          autoComplete="off"
        />
        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-auto rounded-md border border-border bg-background text-foreground shadow-lg ring-1 ring-black/5 dark:ring-white/10">
            {filtered.map((supplier) => (
              <div
                key={String(supplier.id)}
                className="cursor-pointer px-2 py-2 text-sm hover:bg-muted"
                role="option"
                aria-selected={String(supplier.id) === String(value)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onValueChange(String(supplier.id));
                  setSearch(supplier.name);
                  setShowOptions(false);
                }}
              >
                {supplier.name}
              </div>
            ))}
          </div>
        )}
      </div>
      {endAdornment}
    </div>
  );

  if (label !== undefined) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id} className={labelClassName}>
          {label}
        </Label>
        {input}
      </div>
    );
  }

  return input;
}
