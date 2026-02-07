import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function throwIfResNotOk(res: Response, showToast: boolean = false) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let message = text;
    try {
      // If it's JSON, extract the message
      const json = JSON.parse(text);
      message = json.message || text;
    } catch {
      // It's already plain text, no action needed
    }

    // Clean up the message (remove any lingering JSON brackets just in case)
    if (typeof message === 'string' && (message.startsWith('{') && message.endsWith('}'))) {
      try {
        const parsed = JSON.parse(message);
        message = parsed.message || message;
      } catch { }
    }

    // If it's HTML, it's likely a 404 or 500 error page from express/vite
    if (typeof message === 'string' && message.trim().startsWith('<!DOCTYPE html>')) {
      message = "Something went wrong (Server returned an error page)";
    }

    // Only show toast if explicitly requested and it's not a 401
    if (showToast && res.status !== 401) {
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }

    throw new ApiError(message, res.status);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res, true); // Show toast for mutations
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res, false); // Don't show toast for queries
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
