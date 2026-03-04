import { useCallback, useMemo } from 'react'
import type { DateRange } from '@/components/ui/date-range-picker'
import { usePersistentState } from './usePersistentState'

type PersistedDateRange = {
  from: string
  to?: string
}

const toStorageDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fromStorageDate = (value?: string): Date | undefined => {
  if (!value) return undefined
  const parsedDate = new Date(`${value}T12:00:00`)
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate
}

const serializeDateRange = (range?: DateRange): PersistedDateRange | null => {
  if (!range?.from) return null
  return {
    from: toStorageDate(range.from),
    to: range.to ? toStorageDate(range.to) : undefined,
  }
}

const deserializeDateRange = (range: PersistedDateRange | null): DateRange | undefined => {
  if (!range?.from) return undefined

  const from = fromStorageDate(range.from)
  if (!from) return undefined

  return {
    from,
    to: fromStorageDate(range.to),
  }
}

export function usePersistentDateRange(
  key: string,
  initialValue?: DateRange
): [DateRange | undefined, (next: DateRange | undefined) => void] {
  const [storedDateRange, setStoredDateRange] = usePersistentState<PersistedDateRange | null>(
    key,
    serializeDateRange(initialValue)
  )

  const dateRange = useMemo(() => deserializeDateRange(storedDateRange), [storedDateRange])

  const setDateRange = useCallback(
    (next: DateRange | undefined) => {
      setStoredDateRange(serializeDateRange(next))
    },
    [setStoredDateRange]
  )

  return [dateRange, setDateRange]
}