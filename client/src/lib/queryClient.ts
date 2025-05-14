import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    
    try {
      // Try to parse as JSON first
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        
        // Check if there's a message property
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else {
          // Just stringify the entire response as fallback
          errorMessage = JSON.stringify(errorData);
        }
      } else {
        // If not JSON, just get the text
        errorMessage = await res.text() || res.statusText;
      }
    } catch (e) {
      // If parsing fails, fall back to text
      try {
        errorMessage = await res.text() || res.statusText;
      } catch (e2) {
        // If even that fails, use status text
        errorMessage = res.statusText;
      }
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    // Convert any undefined values to null in data object
    const safeData = data ? JSON.parse(JSON.stringify(data)) : undefined;
    
    const res = await fetch(url, {
      method,
      headers: safeData ? { "Content-Type": "application/json" } : {},
      body: safeData ? JSON.stringify(safeData) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Transform any errors with 'undefined' in the message to be more helpful
    if (error instanceof Error && error.message.includes('undefined')) {
      throw new Error(`API request to ${url} failed: Invalid data format. Make sure all required fields are provided.`);
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
