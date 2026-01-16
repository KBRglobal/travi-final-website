import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

/**
 * Hook to sync state with URL query parameters
 * Allows filter state to be shared via URL and persist across refreshes
 */
export function useUrlState<T extends Record<string, string>>(
  defaults: T
): [T, (updates: Partial<T>) => void] {
  const [location, setLocation] = useLocation();

  // Parse current URL params
  const getParamsFromUrl = useCallback((): T => {
    const params = new URLSearchParams(window.location.search);
    const result = { ...defaults };

    for (const key of Object.keys(defaults)) {
      const value = params.get(key);
      if (value !== null) {
        (result as Record<string, string>)[key] = value;
      }
    }

    return result;
  }, [defaults]);

  const [state, setState] = useState<T>(getParamsFromUrl);

  // Sync state from URL on mount and URL changes
  useEffect(() => {
    setState(getParamsFromUrl());
  }, [location, getParamsFromUrl]);

  // Update URL when state changes
  const updateState = useCallback(
    (updates: Partial<T>) => {
      const newState = { ...state, ...updates };
      const params = new URLSearchParams();

      for (const [key, value] of Object.entries(newState)) {
        // Only add non-default values to URL
        if (value && value !== defaults[key as keyof T]) {
          params.set(key, value);
        }
      }

      const search = params.toString();
      const newPath = search ? `${location.split("?")[0]}?${search}` : location.split("?")[0];

      // Update URL without full navigation
      window.history.replaceState(null, "", newPath);
      setState(newState);
    },
    [state, defaults, location]
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
