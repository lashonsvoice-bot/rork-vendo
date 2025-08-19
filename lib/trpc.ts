import { createTRPCReact } from "@trpc/react-query";
import { httpLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const readWebLocalOverride = (): string | undefined => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const v = window.localStorage.getItem('rork.apiBaseUrl') ?? undefined;
      if (v && v.length > 0) return v;
    }
  } catch {}
  return undefined;
};

export const getBaseUrl = (): string => {
  const extra = (Constants?.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const fromLocalOverride = readWebLocalOverride();
  const fromGlobal = (globalThis as unknown as { RORK_API_BASE_URL?: string })?.RORK_API_BASE_URL;
  const fromExtra = typeof extra.EXPO_PUBLIC_RORK_API_BASE_URL === "string" ? (extra.EXPO_PUBLIC_RORK_API_BASE_URL as string) : undefined;
  const fromEnv = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  const fromLegacyEnv = process.env.API_BASE_URL;

  console.log('[tRPC] Environment detection:', {
    fromLocalOverride,
    fromGlobal,
    fromExtra,
    fromEnv,
    fromLegacyEnv,
    platform: Platform.OS,
    hostUri: (Constants as any)?.expoConfig?.hostUri,
    windowOrigin: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'N/A',
    nodeEnv: process.env.NODE_ENV,
    __DEV__: __DEV__
  });

  if (fromLocalOverride && fromLocalOverride.length > 0) {
    console.log('[tRPC] Using base URL from web localStorage override:', fromLocalOverride);
    return fromLocalOverride;
  }
  if (fromGlobal && fromGlobal.length > 0) {
    console.log('[tRPC] Using base URL from global override:', fromGlobal);
    return fromGlobal;
  }
  if (fromExtra && fromExtra.length > 0) {
    console.log('[tRPC] Using base URL from extra:', fromExtra);
    return fromExtra;
  }
  if (fromEnv && fromEnv.length > 0) {
    console.log('[tRPC] Using base URL from env:', fromEnv);
    return fromEnv;
  }
  if (fromLegacyEnv && fromLegacyEnv.length > 0) {
    console.log('[tRPC] Using base URL from legacy env API_BASE_URL:', fromLegacyEnv);
    return fromLegacyEnv;
  }

  const hostUri = (Constants as any)?.expoConfig?.hostUri as string | undefined;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    const url = `http://${host}:3000`;
    console.log('[tRPC] Using Expo hostUri-derived URL:', url);
    return url;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const webFallback = isLocal ? 'http://localhost:3000' : '';
    if (webFallback) {
      console.warn('[tRPC] No base URL configured. Using local web fallback:', webFallback);
      return webFallback;
    }
    throw new Error('[tRPC] Missing EXPO_PUBLIC_RORK_API_BASE_URL for web. Set it to your backend URL (e.g., http://<LAN-IP>:3000) or set localStorage key rork.apiBaseUrl.');
  }

  const fallback = 'http://localhost:3000';
  console.log('[tRPC] Using final fallback URL:', fallback);
  return fallback;
};

export const createTRPCClient = () => {
  const baseUrl = getBaseUrl();
  const sameOrigin = Platform.OS === 'web' && typeof window !== 'undefined' ? (baseUrl === '' || window.location.origin === baseUrl) : false;
  const webOrigin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;

  return trpc.createClient({
    links: [
      httpLink({
        url: `${baseUrl}/api/trpc`,
        transformer: superjson,
        fetch: async (url, options) => {
          const headers: HeadersInit = {
            Accept: 'application/json',
            ...(options?.headers ?? {}),
            'x-client-platform': Platform.OS,
          };

          try {
            const sessionUser = await AsyncStorage.getItem("auth.sessionUser");
            if (sessionUser) {
              const encoded = typeof Buffer !== 'undefined'
                ? Buffer.from(sessionUser, "utf8").toString("base64")
                : btoa(sessionUser);
              (headers as Record<string, string>)["x-session"] = encoded;
            }
          } catch (e) {
            console.warn('[tRPC] Failed to get session from storage:', e);
          }

          console.log('[tRPC] Making request to:', url);

          const doFetch = async (targetUrl: string) => {
            const resp = await fetch(targetUrl as unknown as string, {
              ...options,
              headers,
              credentials: Platform.OS === 'web' ? (sameOrigin ? 'same-origin' : 'omit') : 'omit',
            });
            const contentType = resp.headers.get('content-type') ?? '';
            console.log('[tRPC] Response status:', resp.status, resp.statusText, 'for', targetUrl, 'content-type:', contentType);
            if (!resp.ok && resp.status === 401) {
              console.log('[tRPC] Unauthorized request, clearing session');
              try {
                await AsyncStorage.removeItem('auth.sessionUser');
              } catch (e) {
                console.warn('[tRPC] Failed to clear session:', e);
              }
            }
            if (resp.ok && contentType && contentType.includes('text/html')) {
              console.error('[tRPC] Received HTML instead of JSON from', targetUrl);
              throw new Error('Unexpected HTML response from API. The base URL likely points to a static host without the backend. Configure EXPO_PUBLIC_RORK_API_BASE_URL or run the backend at /api.');
            }
            return resp;
          };

          try {
            return await doFetch(url as unknown as string);
          } catch (error) {
            console.error('[tRPC] Network error:', error);
            console.error('[tRPC] Attempted URL:', url);
            console.error('[tRPC] Base URL:', baseUrl);
            console.error('[tRPC] Host URI:', (Constants as any)?.expoConfig?.hostUri);
            console.error('[tRPC] Platform:', Platform.OS);
            console.error('[tRPC] Request headers:', headers);
            console.error('[tRPC] Request options:', options);

            const isTypeError = error instanceof TypeError && (error.message.includes('Failed to fetch') || error.name === 'TypeError');

            if (isTypeError) {
              const isDev = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl === '';
              if (isDev) {
                const hint = baseUrl === '' ? `${webOrigin ?? 'this host'}/api` : baseUrl;
                throw new Error(`Development server not running: Cannot reach backend at ${hint}. Please start the backend server with 'bun run dev' (backend/server.ts) and ensure EXPO_PUBLIC_RORK_API_BASE_URL is set for non-local web.`);
              } else {
                throw new Error(`Network connectivity error: Cannot reach server at ${baseUrl}. This could be due to:\n1. Backend server not running\n2. CORS configuration issues\n3. Network connectivity problems\n4. Incorrect base URL configuration (set EXPO_PUBLIC_RORK_API_BASE_URL or web localStorage key rork.apiBaseUrl)`);
              }
            }

            throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'} when connecting to ${baseUrl || '(relative /api)'}`);
          }
        },
      }),
    ],
  });
};

export const testTRPCConnection = async (): Promise<boolean> => {
  try {
    const baseUrl = getBaseUrl();
    const testUrl = `${baseUrl}/api`;
    console.log('[tRPC] Testing connection to:', testUrl);

    const res = await fetch(testUrl, { method: 'GET', credentials: Platform.OS === 'web' ? 'same-origin' : 'omit' });
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return false;
    await res.json();
    return true;
  } catch (error) {
    console.error('[tRPC] Connection test failed:', error);
    return false;
  }
};

export const trpcClient = createTRPCClient();