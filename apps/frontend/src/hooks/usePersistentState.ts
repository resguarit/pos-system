import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

type PersistentStateOptions<T> = {
  scope?: string
  storage?: Storage
  serialize?: (value: T) => string
  deserialize?: (value: string) => T
}

export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options: PersistentStateOptions<T> = {}
): [T, Dispatch<SetStateAction<T>>] {
  const location = useLocation()

  const storage = options.storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined)
  const serialize = options.serialize ?? JSON.stringify
  const deserialize = options.deserialize ?? ((value: string) => JSON.parse(value) as T)
  const scope = options.scope ?? location.pathname

  const storageKey = useMemo(() => `persist:${scope}:${key}`, [scope, key])

  const [state, setState] = useState<T>(() => {
    if (!storage) return initialValue

    try {
      const raw = storage.getItem(storageKey)
      if (raw == null) return initialValue
      return deserialize(raw)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    if (!storage) return

    try {
      storage.setItem(storageKey, serialize(state))
    } catch {
      // Ignore persistence errors (quota, private mode, etc.)
    }
  }, [state, storageKey, storage, serialize])

  return [state, setState]
}
