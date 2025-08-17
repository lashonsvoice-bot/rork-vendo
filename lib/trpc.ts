import { createTRPCReact } from "@trpc/react-query";
import { httpLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  if (fromExtra && fromExtra.length > 0) {
    return fromExtra;
  }
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }
  const hostUri = (Constants as any)?.expoConfig?.hostUri as string | undefined;
  if (hostUri && hostUri.length > 0) {
    const host = hostUri.split(":")[0];
    const protocol = host.includes("localhost") || host.match(/\d+\.\d+\.\d+\.\d+/) ? "http" : "https";
    return `${protocol}://${host}`;
  }
  return "http://localhost:8081";
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
          
          const response = await fetch(url, {
            ...options,
            headers,
            credentials: "include",
          });
          
          if (!response.ok && response.status === 401) {
            console.log('[tRPC] Unauthorized request, clearing session');
            try {
              await AsyncStorage.removeItem("auth.sessionUser");
            } catch (e) {
              console.warn('[tRPC] Failed to clear session:', e);
            }
          }
          
          return response;
        },
      }),
    ],
  });
};

export const trpcClient = createTRPCClient();