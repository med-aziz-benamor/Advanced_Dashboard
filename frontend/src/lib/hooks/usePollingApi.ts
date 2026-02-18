/**
 * Hook for polling API endpoints with intelligent pause/resume behavior.
 * Integrates with global refresh bus and respects page visibility.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { subscribeRefresh } from '../utils/refreshBus';
import { usePageVisibility } from './usePageVisibility';
import { useWindowFocus } from './useWindowFocus';
import { stableStringify } from '../utils/stableStringify';

export interface PollingOptions {
  /** Dependencies that trigger a reset of polling */
  deps?: React.DependencyList;
  /** Polling interval in milliseconds (default: 10000) */
  intervalMs?: number;
  /** Enable/disable polling (default: true) */
  enabled?: boolean;
  /** Pause when tab is hidden (default: true) */
  pauseWhenHidden?: boolean;
  /** Pause when window loses focus (default: false) */
  pauseWhenUnfocused?: boolean;
  /** Random jitter to add to interval in ms (default: 250) */
  jitterMs?: number;
  /** Fetch immediately on mount (default: true) */
  immediate?: boolean;
}

export interface PollingResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePollingApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: PollingOptions = {}
): PollingResult<T> {
  const {
    deps = [],
    intervalMs = 10000,
    enabled = true,
    pauseWhenHidden = true,
    pauseWhenUnfocused = false,
    jitterMs = 250,
    immediate = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<Error | null>(null);

  const isVisible = usePageVisibility();
  const isFocused = useWindowFocus();

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const isRequestInFlightRef = useRef<boolean>(false);
  const lastDataStringRef = useRef<string>('');

  // Determine if polling should be paused
  const shouldPause = 
    !enabled ||
    (pauseWhenHidden && !isVisible) ||
    (pauseWhenUnfocused && !isFocused);

  const fetchData = useCallback(async () => {
    // Skip if request already in flight
    if (isRequestInFlightRef.current) {
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    isRequestInFlightRef.current = true;

    try {
      setLoading(true);
      setError(null);

      const result = await fetcher(controller.signal);

      // Only update state if data actually changed (avoid UI thrash)
      const resultString = stableStringify(result);
      if (resultString !== lastDataStringRef.current) {
        lastDataStringRef.current = resultString;
        setData(result);
      }

      setError(null);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
      isRequestInFlightRef.current = false;
      abortControllerRef.current = null;
    }
  }, [fetcher]);

  const scheduleNextPoll = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Don't schedule if paused or disabled
    if (shouldPause) {
      return;
    }

    // Add random jitter to prevent thundering herd
    const jitter = Math.random() * jitterMs;
    const delay = intervalMs + jitter;

    timeoutRef.current = window.setTimeout(() => {
      fetchData().then(() => {
        // Schedule next poll after current one completes
        scheduleNextPoll();
      });
    }, delay);
  }, [fetchData, intervalMs, jitterMs, shouldPause]);

  // Manual refetch function
  const refetch = useCallback(() => {
    fetchData().then(() => {
      // Restart polling cycle after manual refetch
      scheduleNextPoll();
    });
  }, [fetchData, scheduleNextPoll]);

  // Initial fetch and polling setup
  useEffect(() => {
    // Fetch immediately if enabled
    if (immediate && enabled) {
      fetchData();
    }

    // Start polling cycle
    scheduleNextPoll();

    // Subscribe to global refresh bus
    const unsubscribe = subscribeRefresh(() => {
      refetch();
    });

    // Cleanup
    return () => {
      unsubscribe();
      
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, immediate]);

  // Restart polling when pause state changes
  useEffect(() => {
    if (!shouldPause) {
      // Resume polling
      scheduleNextPoll();
    } else {
      // Pause polling
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [shouldPause, scheduleNextPoll]);

  return { data, loading, error, refetch };
}
