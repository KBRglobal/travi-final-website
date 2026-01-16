import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";

const BASE_PATH = "/v2";

export type GeographicLevel = "global" | "country" | "city" | "area";

export interface GeographicContext {
  level: GeographicLevel;
  country?: string;
  city?: string;
  area?: string;
  category?: string;
  itemSlug?: string;
}

interface GeographicContextValue {
  context: GeographicContext;
  basePath: string;
  getContextPath: () => string;
  getExplorePath: (category: string) => string;
  getNewsPath: () => string;
  getItemPath: (itemSlug: string) => string;
}

const GeographicContextInstance = createContext<GeographicContextValue | null>(null);

function parseGeographicContext(pathname: string): GeographicContext {
  const segments = pathname.split("/").filter(Boolean);
  
  const result: GeographicContext = {
    level: "global",
  };

  let i = 0;
  
  while (i < segments.length) {
    const segment = segments[i];
    
    if (segment === "country" && segments[i + 1]) {
      result.country = segments[i + 1];
      result.level = "country";
      i += 2;
      continue;
    }
    
    if (segment === "city" && segments[i + 1]) {
      result.city = segments[i + 1];
      result.level = "city";
      i += 2;
      continue;
    }
    
    if (segment === "area" && segments[i + 1]) {
      result.area = segments[i + 1];
      result.level = "area";
      i += 2;
      continue;
    }
    
    if (segment === "explore" && segments[i + 1]) {
      result.category = segments[i + 1];
      i += 2;
      continue;
    }
    
    if (segment === "item" && segments[i + 1]) {
      result.itemSlug = segments[i + 1];
      i += 2;
      continue;
    }
    
    i++;
  }

  return result;
}

function buildContextPath(context: GeographicContext): string {
  let path = BASE_PATH;
  
  if (context.country) {
    path += `/country/${context.country}`;
  }
  
  if (context.city) {
    path += `/city/${context.city}`;
  }
  
  if (context.area) {
    path += `/area/${context.area}`;
  }
  
  return path;
}

interface GeographicProviderProps {
  children: ReactNode;
}

export function GeographicProvider({ children }: GeographicProviderProps) {
  const [location] = useLocation();

  const value = useMemo<GeographicContextValue>(() => {
    const context = parseGeographicContext(location);
    const contextPath = buildContextPath(context);

    return {
      context,
      basePath: BASE_PATH,
      getContextPath: () => contextPath,
      getExplorePath: (category: string) => `${contextPath}/explore/${category}`,
      getNewsPath: () => `${contextPath}/news`,
      getItemPath: (itemSlug: string) => `${contextPath}/item/${itemSlug}`,
    };
  }, [location]);

  return (
    <GeographicContextInstance.Provider value={value}>
      {children}
    </GeographicContextInstance.Provider>
  );
}

export function useGeographicContext(): GeographicContextValue {
  const context = useContext(GeographicContextInstance);
  if (!context) {
    throw new Error("useGeographicContext must be used within a GeographicProvider");
  }
  return context;
}
