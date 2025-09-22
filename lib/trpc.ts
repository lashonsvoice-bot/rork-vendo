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

  const resolveSameOrigin = (value?: string): string | undefined => {
    if (!value) return undefined;
    if (value === 'same-origin' && Platform.OS === 'web' && typeof window !== 'undefined') {
      const origin = window.location.origin;
      console.log('[tRPC] Resolving "same-origin" to:', origin);
      return origin;
    }
    return value;
  };

  const localResolved = resolveSameOrigin(fromLocalOverride);
  if (localResolved && localResolved.length > 0) {
    console.log('[tRPC] Using base URL from web localStorage override:', localResolved);
    return localResolved;
  }

  const globalResolved = resolveSameOrigin(fromGlobal);
  if (globalResolved && globalResolved.length > 0) {
    console.log('[tRPC] Using base URL from global override:', globalResolved);
    return globalResolved;
  }

  const extraResolved = resolveSameOrigin(fromExtra);
  if (extraResolved && extraResolved.length > 0) {
    console.log('[tRPC] Using base URL from extra:', extraResolved);
    return extraResolved;
  }

  const envResolved = resolveSameOrigin(fromEnv);
  if (envResolved && envResolved.length > 0) {
    console.log('[tRPC] Using base URL from env:', envResolved);
    return envResolved;
  }

  const legacyResolved = resolveSameOrigin(fromLegacyEnv);
  if (legacyResolved && legacyResolved.length > 0) {
    console.log('[tRPC] Using base URL from legacy env API_BASE_URL:', legacyResolved);
    return legacyResolved;
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
    console.warn('[tRPC] Missing EXPO_PUBLIC_RORK_API_BASE_URL on web. Falling back to same-origin relative /api to avoid crash. You can override via localStorage rork.apiBaseUrl');
    return '';
  }

  const fallback = 'http://localhost:3000';
  console.log('[tRPC] Using final fallback URL:', fallback);
  return fallback;
};

export const createTRPCClient = () => {
  const baseUrl = getBaseUrl();
  const web = Platform.OS === 'web' && typeof window !== 'undefined';
  const webOrigin = web ? window.location.origin : undefined;
  const sameOrigin = web ? (baseUrl === '' || baseUrl === webOrigin) : false;

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
                : (globalThis as unknown as { btoa?: (s: string) => string })?.btoa?.(sessionUser) ?? sessionUser;
              (headers as Record<string, string>)["x-session"] = encoded;
            }
          } catch (e) {
            console.warn('[tRPC] Failed to get session from storage:', e);
          }

          console.log('[tRPC] Making request to:', url);

          const doFetch = async (targetUrl: string, useSameOrigin: boolean) => {
            const resp = await fetch(targetUrl as unknown as string, {
              ...options,
              headers,
              credentials: Platform.OS === 'web' ? (useSameOrigin ? 'same-origin' : 'omit') : 'omit',
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

          const tryPrimary = async () => doFetch(url as unknown as string, sameOrigin);

          const tryFallbackSameOrigin = async () => {
            if (!web || !webOrigin) throw new Error('No web origin available for fallback');
            const primary = `${baseUrl}/api/trpc`;
            const fallbackBase = webOrigin;
            const targetUrl = String(url).replace(primary, `${fallbackBase}/api/trpc`);
            console.warn('[tRPC] Falling back to same-origin API:', targetUrl);
            return doFetch(targetUrl, true);
          };

          try {
            return await tryPrimary();
          } catch (error) {
            console.error('[tRPC] Network error (primary):', error);
            console.error('[tRPC] Attempted URL:', url);
            console.error('[tRPC] Base URL:', baseUrl);
            console.error('[tRPC] Host URI:', (Constants as any)?.expoConfig?.hostUri);
            console.error('[tRPC] Platform:', Platform.OS);
            console.error('[tRPC] Request headers:', headers);
            console.error('[tRPC] Request options:', options);

            const isTypeError = error instanceof TypeError && (error.message.includes('Failed to fetch') || error.name === 'TypeError');

            if (isTypeError && web && !sameOrigin) {
              try {
                const resp = await tryFallbackSameOrigin();
                if (resp) return resp;
              } catch (fallbackErr) {
                console.error('[tRPC] Fallback same-origin request also failed:', fallbackErr);
              }
            }

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
  let baseUrl: string;
  try {
    baseUrl = getBaseUrl();
  } catch (e) {
    console.warn('[tRPC] Connection test aborted: getBaseUrl threw:', (e as Error)?.message);
    return false;
  }
  const web = Platform.OS === 'web' && typeof window !== 'undefined';
  const webOrigin = web ? window.location.origin : undefined;
  const test = async (url: string) => {
    try {
      console.log('[tRPC] Testing connection to:', url);
      const res = await fetch(url, { method: 'GET', credentials: web ? (url.startsWith(webOrigin ?? '__none__') ? 'same-origin' : 'omit') : 'omit' });
      if (!res.ok) return false;
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) return false;
      await res.json();
      return true;
    } catch (e) {
      console.warn('[tRPC] Connection test to', url, 'failed:', (e as Error)?.message);
      return false;
    }
  };

  const primaryOk = await test(`${baseUrl}/api`);
  if (primaryOk) return true;

  if (web && webOrigin && baseUrl !== webOrigin) {
    const fallbackOk = await test(`${webOrigin}/api`);
    if (fallbackOk) return true;
  }

  console.error('[tRPC] Connection test failed: no reachable API at baseUrl or same-origin.');
  return false;
};

export const trpcClient = createTRPCClient();