import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";

/**
 * Hook to sync state with URL query parameters
 * Allows filter state to be shared via URL and persist across refreshes
 */
export function useUrlState<T extends Record<string, string>>(
  defaults: T
): [T, (updates: Partial<T>) => void] {
  const [location] = useLocation();

  // Stabilize defaults reference to prevent infinite re-renders
  const defaultsRef = useRef(defaults);
  const stableDefaults = useMemo(() => {
    // Only update if keys or values changed
    const current = defaultsRef.current;
    const keys = Object.keys(defaults);
    const currentKeys = Object.keys(current);
    if (keys.length !== currentKeys.length || keys.some(k => defaults[k] !== current[k])) {
      defaultsRef.current = defaults;
      return defaults;
    }
    return current;
  }, [JSON.stringify(defaults)]);

  // Parse current URL params
  const getParamsFromUrl = useCallback((): T => {
    const params = new URLSearchParams(globalThis.location.search);
    const result = { ...stableDefaults };

    for (const key of Object.keys(stableDefaults)) {
      const value = params.get(key);
      if (value !== null) {
        (result as Record<string, string>)[key] = value;
      }
    }

    return result;
  }, [stableDefaults]);

  const [state, setState] = useState<T>(getParamsFromUrl);

  // Sync state from URL on mount and URL changes
  useEffect(() => {
    const newState = getParamsFromUrl();
    // Only update if state actually changed
    setState(prev => {
      const keys = Object.keys(newState);
      if (keys.length !== Object.keys(prev).length || keys.some(k => newState[k] !== prev[k])) {
        return newState;
      }
      return prev;
    });
  }, [location, getParamsFromUrl]);

  // Update URL when state changes
  const updateState = useCallback(
    (updates: Partial<T>) => {
      const newState = { ...state, ...updates };
      const params = new URLSearchParams();

      for (const [key, value] of Object.entries(newState)) {
        // Only add non-default values to URL
        if (value && value !== stableDefaults[key as keyof T]) {
          params.set(key, value);
        }
      }

      const search = params.toString();
      const newPath = search ? `${location.split("?")[0]}?${search}` : location.split("?")[0];

      // Update URL without full navigation
      globalThis.history.replaceState(null, "", newPath);
      setState(newState);
    },
    [state, stableDefaults, location]
  );

  return [state, updateState];
}

/**
 * Simpler hook for a single URL param
 */
export function useUrlParam(
  key: string,
  defaultValue: string = ""
): [string, (value: string) => void] {
  const [state, updateState] = useUrlState({ [key]: defaultValue });

  const setValue = useCallback(
    (value: string) => {
      updateState({ [key]: value });
    },
    [key, updateState]
  );

  return [state[key], setValue];
}
