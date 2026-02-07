import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";

interface FavoriteItem {
  id: string;
  type: "attraction" | "hotel" | "restaurant" | "event" | "district" | "article";
  title: string;
  image?: string;
  slug: string;
  addedAt: number;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  addFavorite: (item: Omit<FavoriteItem, "addedAt">) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: Omit<FavoriteItem, "addedAt">) => void;
  clearFavorites: () => void;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY = "travi_favorites";

function loadFavorites(): FavoriteItem[] {
  if (globalThis.window === undefined) return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: FavoriteItem[]) {
  if (globalThis.window === undefined) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function FavoritesProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFavorites(loadFavorites());
  }, []);

  useEffect(() => {
    if (mounted) {
      saveFavorites(favorites);
    }
  }, [favorites, mounted]);

  const addFavorite = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === item.id)) return prev;
      return [...prev, { ...item, addedAt: Date.now() }];
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  }, []);

  const isFavorite = useCallback(
    (id: string) => {
      return favorites.some(f => f.id === id);
    },
    [favorites]
  );

  const toggleFavorite = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === item.id);
      if (exists) {
        return prev.filter(f => f.id !== item.id);
      }
      return [...prev, { ...item, addedAt: Date.now() }];
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  const contextValue = useMemo(
    () => ({
      favorites,
      addFavorite,
      removeFavorite,
      isFavorite,
      toggleFavorite,
      clearFavorites,
      count: favorites.length,
    }),
    [favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite, clearFavorites]
  );

  return <FavoritesContext.Provider value={contextValue}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
