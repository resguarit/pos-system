import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"

type DateInputDmyProps = {
  id?: string
  value: string
  onChange: (nextIsoDate: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  "aria-label"?: string
}

const pad2 = (n: number) => String(n).padStart(2, "0")

const isoToDmy = (iso: string): string => {
  // Accept "YYYY-MM-DD" or full ISO; only date part is used.
  const datePart = (iso || "").split("T")[0]
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
  if (!m) return ""
  const [, y, mm, dd] = m
  return `${dd}/${mm}/${y}`
}

const sanitizeMasked = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 8) // ddmmyyyy
  const dd = digits.slice(0, 2)
  const mm = digits.slice(2, 4)
  const yyyy = digits.slice(4, 8)
  let out = dd
  if (mm) out += `/${mm}`
  if (yyyy) out += `/${yyyy}`
  return out
}

const dmyToIsoIfValid = (dmy: string): string | null => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy)
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null
  if (yyyy < 1900 || yyyy > 2100) return null
  if (mm < 1 || mm > 12) return null
  if (dd < 1 || dd > 31) return null

  // Validate real calendar date.
  const dt = new Date(yyyy, mm - 1, dd)
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return null

  return `${yyyy}-${pad2(mm)}-${pad2(dd)}`
}

export function DateInputDmy({
  id,
  value,
  onChange,
  disabled,
  placeholder = "dd/mm/aaaa",
  className,
  "aria-label": ariaLabel,
}: DateInputDmyProps) {
  const initial = useMemo(() => isoToDmy(value), [value])
  const [display, setDisplay] = useState(initial)

  // Keep display synced when value changes externally.
  useEffect(() => {
    setDisplay(isoToDmy(value))
  }, [value])

  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      disabled={disabled}
      value={display}
      className={className}
      aria-label={ariaLabel}
      onChange={(e) => {
        const nextDisplay = sanitizeMasked(e.target.value)
        setDisplay(nextDisplay)
        const maybeIso = dmyToIsoIfValid(nextDisplay)
        if (maybeIso) onChange(maybeIso)
      }}
      onBlur={() => {
        const maybeIso = dmyToIsoIfValid(display)
        if (maybeIso) {
          // Normalize display on blur.
          setDisplay(isoToDmy(maybeIso))
          return
        }
        // If invalid/incomplete, reset to current value.
        setDisplay(isoToDmy(value))
      }}
    />
  )
}

