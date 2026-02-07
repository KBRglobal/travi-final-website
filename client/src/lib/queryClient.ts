import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  data?: unknown;
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrOptions?: string | ApiRequestOptions,
  data?: unknown
): Promise<Response> {
  let method: string;
  let url: string;
  let bodyData: unknown;

  if (typeof urlOrOptions === "object") {
    url = methodOrUrl;
    method = urlOrOptions.method || "GET";
    bodyData = urlOrOptions.body || urlOrOptions.data;
  } else if (typeof urlOrOptions === "string") {
    method = methodOrUrl;
    url = urlOrOptions;
    bodyData = data;
  } else {
    method = "GET";
    url = methodOrUrl;
    bodyData = undefined;
  }

  const headers: Record<string, string> = {};
  if (bodyData) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: bodyData ? JSON.stringify(bodyData) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
      retry: 1, // Retry once on failure
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
