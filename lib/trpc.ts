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
  // Check for explicit environment variables first
  const extra = (Constants?.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const fromExtra = typeof extra.EXPO_PUBLIC_RORK_API_BASE_URL === "string" ? (extra.EXPO_PUBLIC_RORK_API_BASE_URL as string) : undefined;
  const fromEnv = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  console.log('[tRPC] Environment detection:', {
    fromExtra,
    fromEnv,
    platform: Platform.OS,
    hostUri: (Constants as any)?.expoConfig?.hostUri,
    windowOrigin: Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : 'N/A'
  });

  if (fromExtra && fromExtra.length > 0) {
    console.log('[tRPC] Using base URL from extra:', fromExtra);
    return fromExtra;
  }
  if (fromEnv && fromEnv.length > 0) {
    console.log('[tRPC] Using base URL from env:', fromEnv);
    return fromEnv;
  }
  
  // For web, use current origin
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const origin = window.location.origin;
    console.log('[tRPC] Using web origin:', origin);
    return origin;
  }
  
  // For Rork platform, detect the deployment URL
  const hostUri = (Constants as any)?.expoConfig?.hostUri as string | undefined;
  if (hostUri && hostUri.length > 0) {
    const host = hostUri.split(":")[0];
    
    // Check if this is a Rork deployment
    if (host.includes("rorktest.dev") || host.includes("rork.com")) {
      const url = `https://${host}`;
      console.log('[tRPC] Using Rork deployment URL:', url);
      return url;
    }
    
    // Local development
    const protocol = host.includes("localhost") || host.match(/\d+\.\d+\.\d+\.\d+/) ? "http" : "https";
    const url = `${protocol}://${host}:3000`;
    console.log('[tRPC] Using local development URL:', url);
    return url;
  }
  
  const fallback = "http://localhost:3000";
  console.log('[tRPC] Using fallback URL:', fallback);
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
              credentials: "include",
            });
            
            console.log('[tRPC] Response status:', response.status, response.statusText);
            
            if (!response.ok && response.status === 401) {
              console.log('[tRPC] Unauthorized request, clearing session');
              try {
                await AsyncStorage.removeItem("auth.sessionUser");
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
              throw new Error(`Network connectivity error: Cannot reach server at ${baseUrl}. This could be due to:\n1. Backend server not running\n2. CORS configuration issues\n3. Network connectivity problems\n4. Incorrect base URL configuration`);
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
    console.log('[tRPC] Testing connection to:', `${baseUrl}/api/trpc`);
    
    const response = await fetch(`${baseUrl}/api`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[tRPC] Test response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[tRPC] Test response data:', data);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[tRPC] Connection test failed:', error);
    return false;
  }
};

export const trpcClient = createTRPCClient();