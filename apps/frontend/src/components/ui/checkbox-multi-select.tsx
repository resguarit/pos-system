import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxOption {
  label: string;
  value: string;
  color?: string;
}

interface CheckboxMultiSelectProps {
  options: CheckboxOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function CheckboxMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleccionar...",
  className,
}: CheckboxMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const computeAlignment = () => {
    if (!popoverRef.current || window.innerWidth < 640) return;
    const rect = popoverRef.current.getBoundingClientRect();
    const dropdownWidth = 288; // ~ w-72 en px
    const spaceRight = window.innerWidth - rect.left;
    setAlignRight(spaceRight < dropdownWidth + 16);
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setIsOpen(false); }
    function onClick(e: MouseEvent) {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    if (isOpen) {
      computeAlignment();
      document.addEventListener('keydown', onKey);
      document.addEventListener('mousedown', onClick);
      window.addEventListener('resize', computeAlignment);
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('resize', computeAlignment);
    };
  }, [isOpen]);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((x) => x !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const toggleAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  };

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label || placeholder
      : `${selected.length} seleccionados`;

  return (
    <div className={cn("relative", className)} ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm transition-colors",
          "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          selected.length === 0 ? "text-gray-500" : "text-gray-700"
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform flex-shrink-0 ml-2",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div
          className={cn(
            "z-50 p-2 bg-white border border-gray-300 rounded-lg shadow-lg",
            "fixed left-2 right-2 max-h-[70vh] overflow-auto",
            "sm:absolute sm:top-auto sm:mt-2 sm:w-72 sm:max-h-72 sm:overflow-auto",
            alignRight ? "sm:right-0 sm:left-auto" : "sm:left-0 sm:right-auto"
          )}
        >
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-xs text-gray-500">{options.length} opciones</span>
            {options.length > 1 && (
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={toggleAll}
              >
                {selected.length === options.length ? 'Limpiar' : 'Seleccionar todas'}
              </button>
            )}
          </div>
          <div>
            {options.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors",
                    "hover:bg-gray-100",
                    checked && "bg-blue-50"
                  )}
                >
                  <span className={cn(
                    "h-5 w-5 inline-flex items-center justify-center rounded border-2 flex-shrink-0 transition-colors",
                    checked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-500"
                  )}>
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <div className="flex-1 text-left">
                    <div className={cn(
                      "font-medium flex items-center gap-2",
                      checked ? "text-blue-700" : "text-gray-700"
                    )}>
                      {option.color && (
                        <div
                          className="w-3 h-3 rounded-full border flex-shrink-0"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      <span className="truncate">{option.label}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
