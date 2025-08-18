import { createTRPCReact } from "@trpc/react-query";
import { httpLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Log initialization
console.log('[tRPC] Initializing tRPC client...');
console.log('[tRPC] Constants available:', !!Constants);
console.log('[tRPC] Platform:', Platform.OS);

export const trpc = createTRPCReact<AppRouter>();

export const isTRPCClientError = (error: unknown): error is TRPCClientError<AppRouter> => {
  return error instanceof TRPCClientError;
};

export const handleTRPCError = (error: unknown): string => {
  if (isTRPCClientError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const getBaseUrl = (): string => {
  const extra = (Constants?.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const fromExtra = typeof extra.EXPO_PUBLIC_RORK_API_BASE_URL === "string" ? (extra.EXPO_PUBLIC_RORK_API_BASE_URL as string) : undefined;
  const fromEnv = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  console.log('[tRPC] Environment detection:', {
    fromExtra,
    fromEnv,
    platform: Platform.OS,
    hostUri: (Constants as any)?.expoConfig?.hostUri,
    windowOrigin: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'N/A',
    nodeEnv: process.env.NODE_ENV,
    __DEV__: __DEV__
  });

  // 1) Explicit config wins in ALL environments
  if (fromExtra && fromExtra.length > 0) {
    console.log('[tRPC] Using base URL from extra:', fromExtra);
    return fromExtra;
  }
  if (fromEnv && fromEnv.length > 0) {
    console.log('[tRPC] Using base URL from env:', fromEnv);
    return fromEnv;
  }

  // 2) Web: use the current origin (works on rorktest.dev previews and localhost)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const origin = window.location.origin;
    console.log('[tRPC] Using web origin:', origin);
    return origin;
  }

  // 3) Native dev: try to construct LAN URL from Expo hostUri
  const hostUri = (Constants as any)?.expoConfig?.hostUri as string | undefined;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    const url = `http://${host}:3000`;
    console.log('[tRPC] Using Expo hostUri-derived URL:', url);
    return url;
  }

  // 4) Fallback to localhost
  const fallback = 'http://localhost:3000';
  console.log('[tRPC] Using final fallback URL:', fallback);
  return fallback;
};

export const createTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
        fetch: async (url, options) => {
          const headers: HeadersInit = {
            ...options?.headers,
          };
          
          try {
            const sessionUser = await AsyncStorage.getItem("auth.sessionUser");
            if (sessionUser) {
              const encoded = typeof Buffer !== 'undefined' 
                ? Buffer.from(sessionUser, "utf8").toString("base64")
                : btoa(sessionUser); // Web fallback
              (headers as Record<string, string>)["x-session"] = encoded;
            }
          } catch (e) {
            console.warn('[tRPC] Failed to get session from storage:', e);
          }
          
          console.log('[tRPC] Making request to:', url);
          
          try {
            const response = await fetch(url, {
              ...options,
              headers,
              credentials: 'include',
            });
            
            console.log('[tRPC] Response status:', response.status, response.statusText);
            
            if (!response.ok && response.status === 401) {
              console.log('[tRPC] Unauthorized request, clearing session');
              try {
                await AsyncStorage.removeItem('auth.sessionUser');
              } catch (e) {
                console.warn('[tRPC] Failed to clear session:', e);
              }
            }
            
            return response;
          } catch (error) {
            const baseUrl = getBaseUrl();
            console.error('[tRPC] Network error:', error);
            console.error('[tRPC] Attempted URL:', url);
            console.error('[tRPC] Base URL:', baseUrl);
            console.error('[tRPC] Host URI:', (Constants as any)?.expoConfig?.hostUri);
            console.error('[tRPC] Platform:', Platform.OS);
            console.error('[tRPC] Request headers:', headers);
            console.error('[tRPC] Request options:', options);
            
            // Check if this is a CORS or network connectivity issue
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
              // For development, provide a more helpful error message
              const isDev = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
              if (isDev) {
                throw new Error(`Development server not running: Cannot reach backend at ${baseUrl}. Please start the backend server with 'bun run dev' or check if it's running on the correct port.`);
              } else {
                throw new Error(`Network connectivity error: Cannot reach server at ${baseUrl}. This could be due to:\n1. Backend server not running\n2. CORS configuration issues\n3. Network connectivity problems\n4. Incorrect base URL configuration`);
              }
            }
            
            throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'} when connecting to ${baseUrl}`);
          }
        },
      }),
    ],
  });
};

// Create a function to test the connection
export const testTRPCConnection = async (): Promise<boolean> => {
  try {
    const baseUrl = getBaseUrl();
    console.log('[tRPC] Testing connection to:', `${baseUrl}/api`);
    
    const response = await fetch(`${baseUrl}/api`, {
      method: 'GET',
    });
    
    console.log('[tRPC] Test response status:', response.status);
    
    if (!response.ok) return false;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      console.warn('[tRPC] Test endpoint did not return JSON. content-type:', contentType);
      return false;
    }

    const data = await response.json();
    console.log('[tRPC] Test response data:', data);
    return true;
  } catch (error) {
    console.error('[tRPC] Connection test failed:', error);
    return false;
  }
};

export const trpcClient = createTRPCClient();