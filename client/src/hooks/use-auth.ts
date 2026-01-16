import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

export type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: "admin" | "editor" | "author" | "contributor" | "viewer";
  isActive: boolean;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

export function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message === "401" || error.message.toLowerCase().includes("unauthorized");
  }
  if (typeof error === "object" && error !== null) {
    const e = error as { status?: number; message?: string };
    return e.status === 401 || e.message?.toLowerCase().includes("unauthorized") || false;
  }
  return false;
}

export function useAuth(): AuthState {
  const { data, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  // Handle unauthorized errors - user is not logged in
  if (error) {
    return {
      user: null,
      isLoading: false,
      isAuthenticated: false,
    };
  }

  return {
    user: data || null,
    isLoading,
    isAuthenticated: !!data,
  };
}

export function useRequireAuth(redirectTo: string = "/") {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation(redirectTo);
    }
  }, [isLoading, isAuthenticated, setLocation, redirectTo]);

  return { user, isLoading, isAuthenticated };
}
