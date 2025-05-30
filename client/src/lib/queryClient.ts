import { QueryClient, QueryFunction } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper to throw detailed error for non-ok responses
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    console.error(`API Error: ${res.status} - ${text}`);
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
}

// General API request wrapper for mutations
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = data
    ? { 'Content-Type': 'application/json' }
    : {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include', // Optional: only if using cookies too
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = 'returnNull' | 'throw';

// Factory function to create a query function with 401 handling
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;

    const res = await fetch(`${API_BASE_URL}${url}`, {
      credentials: 'include', // ✅ Send cookies/session
    });

    if (res.status === 401) {
      if (on401 === 'returnNull') {
        return null as T;
      }
      throw new Error('Unauthorized (401)');
    }

    await throwIfResNotOk(res);
    return res.json();
  };

// React Query Client setup
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: 'throw' }),
      refetchOnWindowFocus: false,
      refetchInterval: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
