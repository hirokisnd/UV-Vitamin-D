import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(method: string, route: string, data?: unknown): Promise<Response> {
  const routePath = route.startsWith("/") ? route : `/${route}`;
  const res = await fetch(routePath, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "same-origin",
  });
  await throwIfResNotOk(res);
  return res;
}

export const getQueryFn: <T>(options: { on401: "returnNull" | "throw" }) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const routePath = "/" + queryKey.join("/");
    const res = await fetch(routePath, { credentials: "same-origin" });
    if (on401 === "returnNull" && res.status === 401) return null;
    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 24 * 60 * 60 * 1000, // 24h
      gcTime: 5 * 24 * 60 * 60 * 1000, // 5日 (cacheTime → gcTime in v5)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});