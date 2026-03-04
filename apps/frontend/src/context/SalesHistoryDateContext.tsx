import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { startOfMonth } from "date-fns";
import type { DateRange } from "@/components/ui/date-range-picker";

interface SalesHistoryDateContextType {
  dateRange: DateRange | undefined;
  setDateRange: Dispatch<SetStateAction<DateRange | undefined>>;
  resetDateRange: () => void;
}

const STORAGE_KEY = "sales-history-date-range";

const SalesHistoryDateContext = createContext<SalesHistoryDateContextType | undefined>(undefined);

const isValidDate = (date: unknown): date is Date => {
  return date instanceof Date && !Number.isNaN(date.getTime());
};

const getDefaultDateRange = (): DateRange => {
  const today = new Date();
  return {
    from: startOfMonth(today),
    to: today,
  };
};

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return isValidDate(parsed) ? parsed : undefined;
};

const loadInitialDateRange = (): DateRange => {
  if (typeof window === "undefined") return getDefaultDateRange();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultDateRange();

    const parsed = JSON.parse(raw) as { from?: string; to?: string };
    const from = parseDate(parsed.from);
    const to = parseDate(parsed.to);

    if (!from) return getDefaultDateRange();
    return { from, to };
  } catch {
    return getDefaultDateRange();
  }
};

export function SalesHistoryDateProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(loadInitialDateRange);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!dateRange?.from || !isValidDate(dateRange.from)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const payload = {
      from: dateRange.from.toISOString(),
      to: dateRange.to && isValidDate(dateRange.to) ? dateRange.to.toISOString() : undefined,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [dateRange]);

  const value = useMemo(
    () => ({
      dateRange,
      setDateRange,
      resetDateRange: () => setDateRange(getDefaultDateRange()),
    }),
    [dateRange]
  );

  return <SalesHistoryDateContext.Provider value={value}>{children}</SalesHistoryDateContext.Provider>;
}

export function useSalesHistoryDate() {
  const context = useContext(SalesHistoryDateContext);
  if (!context) {
    throw new Error("useSalesHistoryDate must be used within SalesHistoryDateProvider");
  }
  return context;
}
