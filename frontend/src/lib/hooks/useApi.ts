/**
 * useApi - Generic data fetching hook with loading/error states
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Generic API hook with AbortController for cleanup
 * @param fetcher - Async function that accepts AbortSignal
 * @param deps - Dependency array (triggers refetch when changed)
 */
export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [refetchCounter, setRefetchCounter] = useState(0)
  
  // Track mounted state to avoid setState on unmounted component
  const isMountedRef = useRef(true)

  const refetch = useCallback(() => {
    setRefetchCounter((prev) => prev + 1)
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    const controller = new AbortController()
    const signal = controller.signal

    setLoading(true)
    setError(null)

    fetcher(signal)
      .then((result) => {
        if (isMountedRef.current) {
          setData(result)
          setError(null)
        }
      })
      .catch((err) => {
        if (isMountedRef.current && err.name !== 'AbortError') {
          setError(err instanceof Error ? err : new Error('Unknown error'))
          setData(null)
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setLoading(false)
        }
      })

    return () => {
      isMountedRef.current = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refetchCounter])

  return { data, loading, error, refetch }
}
