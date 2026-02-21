import { useState, useEffect, useRef, useCallback } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import useApi from '@/hooks/useApi'

interface UseDebouncedSearchOptions {
    /** API endpoint path, e.g. '/users' or '/customers' */
    endpoint: string
    /** Extra query params appended to every request, e.g. { limit: '20' } */
    extraParams?: Record<string, string>
    /** Debounce delay in ms (default: 300) */
    delay?: number
    /**
     * Extract the results array from the API response.
     * Default: tries response.data (array) → response.data.data → []
     */
    extractData?: (response: unknown) => unknown[]
}

interface UseDebouncedSearchReturn<T> {
    /** Current search results */
    results: T[]
    /** Whether a search request is in flight */
    isSearching: boolean
    /** Trigger a debounced search — call this on every input change */
    search: (term: string) => void
    /** Reset results to empty array */
    clear: () => void
    /** Manually override results (useful for pre-populating in edit mode) */
    setResults: React.Dispatch<React.SetStateAction<T[]>>
}

/**
 * Generic, reusable hook for debounced server-side search.
 *
 * Handles:
 * - Debouncing via `useDebouncedValue`
 * - Stale-request protection via incrementing request ID
 * - Cleanup on unmount
 * - Loading state
 *
 * @example
 * ```tsx
 * const { results, isSearching, search, clear } = useDebouncedSearch<User>({
 *   endpoint: '/users',
 *   extraParams: { limit: '20' },
 * })
 * ```
 */
export function useDebouncedSearch<T = unknown>(
    options: UseDebouncedSearchOptions
): UseDebouncedSearchReturn<T> {
    const { endpoint, extraParams, delay = 300, extractData } = options
    const { request } = useApi()

    const [searchTerm, setSearchTerm] = useState<string | null>(null)
    const [results, setResults] = useState<T[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // Only start debouncing once search() has been called at least once
    const debouncedTerm = useDebouncedValue(searchTerm, delay)

    // Track the latest request to ignore stale responses
    const requestIdRef = useRef(0)
    // Keep request ref fresh to avoid stale closure
    const requestRef = useRef(request)
    requestRef.current = request
    // Keep extractData ref fresh
    const extractDataRef = useRef(extractData)
    extractDataRef.current = extractData
    // Keep extraParams ref fresh
    const extraParamsRef = useRef(extraParams)
    extraParamsRef.current = extraParams

    // Perform the actual API call whenever the debounced term changes
    useEffect(() => {
        // Don't fire on mount — wait until search() is called at least once
        if (debouncedTerm === null) return

        const currentRequestId = ++requestIdRef.current
        let cancelled = false

        const performSearch = async () => {
            setIsSearching(true)
            try {
                const params = new URLSearchParams()
                const trimmed = debouncedTerm.trim()
                if (trimmed) {
                    params.append('search', trimmed)
                }
                // Append any extra params (e.g. limit)
                const currentExtraParams = extraParamsRef.current
                if (currentExtraParams) {
                    Object.entries(currentExtraParams).forEach(([key, value]) => {
                        params.append(key, value)
                    })
                }

                const queryString = params.toString()
                const url = queryString ? `${endpoint}?${queryString}` : endpoint

                const response = await requestRef.current({ method: 'GET', url })

                // Ignore stale responses
                if (cancelled || currentRequestId !== requestIdRef.current) return

                let data: T[]
                const currentExtractData = extractDataRef.current
                if (currentExtractData) {
                    data = currentExtractData(response) as T[]
                } else {
                    // Default extraction: handle common response shapes
                    // useApi.request returns axios response.data, so response is the API body
                    if (response?.data) {
                        data = Array.isArray(response.data)
                            ? response.data
                            : response.data.data || []
                    } else if (Array.isArray(response)) {
                        data = response
                    } else {
                        data = []
                    }
                }
                setResults(data)
            } catch (error) {
                if (cancelled || currentRequestId !== requestIdRef.current) return
                console.error(`Error searching ${endpoint}:`, error)
                setResults([])
            } finally {
                if (!cancelled && currentRequestId === requestIdRef.current) {
                    setIsSearching(false)
                }
            }
        }

        performSearch()

        return () => {
            cancelled = true
        }
    }, [debouncedTerm, endpoint])

    const search = useCallback((term: string) => {
        setSearchTerm(term)
    }, [])

    const clear = useCallback(() => {
        setSearchTerm(null)
        setResults([])
        setIsSearching(false)
    }, [])

    return { results, isSearching, search, clear, setResults }
}
