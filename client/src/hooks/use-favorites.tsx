import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: FavoriteItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
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

  const addFavorite = (item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.id === item.id)) return prev;
      return [...prev, { ...item, addedAt: Date.now() }];
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const isFavorite = (id: string) => {
    return favorites.some((f) => f.id === id);
  };

  const toggleFavorite = (item: Omit<FavoriteItem, "addedAt">) => {
    if (isFavorite(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite(item);
    }
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        toggleFavorite,
        clearFavorites,
        count: favorites.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
