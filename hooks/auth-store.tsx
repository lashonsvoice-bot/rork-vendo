import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getBaseUrl } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AuthRole = "business_owner" | "contractor" | "event_host" | "admin" | "guest";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
}

interface AuthResponse {
  user: SessionUser | null;
  error?: string;
}

type BusinessOwnerProfileInput = {
  role: "business_owner";
  companyName?: string;
  companyWebsite?: string | null;
  description?: string | null;
  location?: string | null;
  phone?: string | null;
  needs?: string[] | null;
};

type ContractorProfileInput = {
  role: "contractor";
  skills?: string[];
  ratePerHour?: number | null;
  bio?: string | null;
  portfolioUrl?: string | null;
  location?: string | null;
  availability?: "full_time" | "part_time" | "contract" | null;
};

type EventHostProfileInput = {
  role: "event_host";
  organizationName?: string | null;
  eventsHosted?: number | null;
  interests?: string[] | null;
  bio?: string | null;
  location?: string | null;
};

type AnyProfileSignupInput = BusinessOwnerProfileInput | ContractorProfileInput | EventHostProfileInput;

interface SignUpInput {
  email: string;
  password: string;
  name: string;
  role: AuthRole;
  profile?: AnyProfileSignupInput;
}

interface SignInInput {
  email: string;
  password: string;
}

interface GuestSignInInput {
  email: string;
  agreeToNewsletter?: boolean;
}

const STORAGE_KEY = "auth.sessionUser";

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const baseUrl = getBaseUrl();

  const withCredentialsFetch = useCallback(async (path: string, init?: RequestInit) => {
    const url = `${baseUrl}/api${path}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    };
    if (user) {
      try {
        const userJson = JSON.stringify(user);
        const encoded = typeof Buffer !== 'undefined' 
          ? Buffer.from(userJson, "utf8").toString("base64")
          : btoa(userJson);
        (headers as Record<string, string>)["x-session"] = encoded;
      } catch (e) {
        console.warn('[auth] Failed to encode session:', e);
      }
    }
    const resp = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
      mode: "cors",
    });
    return resp;
  }, [baseUrl, user]);

  const saveSession = useCallback(async (u: SessionUser | null) => {
    try {
      if (u) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        console.log('[auth] Session saved to storage');
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
        console.log('[auth] Session removed from storage');
      }
    } catch (e) {
      console.log("[auth] persist error", e);
    }
  }, []);



  const initialize = useCallback(async () => {
    console.log('[auth] Initializing auth system...');
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to restore existing session first
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const sessionUser = JSON.parse(stored) as SessionUser;
          console.log('[auth] Restored session for:', sessionUser.email, sessionUser.role);
          setUser(sessionUser);
        } catch {
          console.log('[auth] Failed to parse stored session, clearing');
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } else {
        console.log('[auth] No existing session found');
        setUser(null);
      }
    } catch (e: any) {
      console.error('[auth] Initialization error:', e);
      setError(e?.message ?? "Failed to initialize auth");
      setUser(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
      console.log('[auth] Auth system initialized');
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const setAndPersist = useCallback(async (u: SessionUser) => {
    console.log('[auth] Setting and persisting user:', u.email, u.role);
    setUser(u);
    await saveSession(u);
  }, [saveSession]);

  const clearSession = useCallback(async () => {
    console.log('[auth] Clearing session');
    setUser(null);
    await saveSession(null);
  }, [saveSession]);

  const signup = useCallback(async (input: SignUpInput) => {
    console.log('[auth] Starting signup for:', input.email, input.role);
    setError(null);
    setIsLoading(true);
    
    try {
      const resp = await withCredentialsFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify(input),
      });
      
      const json = (await resp.json()) as AuthResponse;
      
      if (!resp.ok || !json.user) {
        throw new Error(json.error ?? "Signup failed");
      }
      
      console.log('[auth] Signup successful for:', json.user.email, json.user.role);
      await setAndPersist(json.user);
      return json.user;
    } catch (e: any) {
      console.error("[auth] signup error", e);
      setError(e?.message ?? "Signup failed");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [withCredentialsFetch, setAndPersist]);

  const signin = useCallback(async (input: SignInInput) => {
    console.log('[auth] Starting signin for:', input.email);
    setError(null);
    setIsLoading(true);
    
    try {
      const resp = await withCredentialsFetch("/auth/signin", {
        method: "POST",
        body: JSON.stringify(input),
      });
      
      const json = (await resp.json()) as AuthResponse;
      
      if (!resp.ok || !json.user) {
        throw new Error(json.error ?? "Signin failed");
      }
      
      console.log('[auth] Signin successful for:', json.user.email, json.user.role);
      await setAndPersist(json.user);
      return json.user;
    } catch (e: any) {
      console.error("[auth] signin error", e);
      setError(e?.message ?? "Signin failed");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [withCredentialsFetch, setAndPersist]);

  const guestSignin = useCallback(async (input: GuestSignInInput) => {
    console.log('[auth] Starting guest signin for:', input.email);
    setError(null);
    setIsLoading(true);
    
    try {
      const resp = await withCredentialsFetch("/auth/guest-signin", {
        method: "POST",
        body: JSON.stringify(input),
      });
      
      const json = (await resp.json()) as AuthResponse;
      
      if (!resp.ok || !json.user) {
        throw new Error(json.error ?? "Guest signin failed");
      }
      
      console.log('[auth] Guest signin successful for:', json.user.email);
      await setAndPersist(json.user);
      return json.user;
    } catch (e: any) {
      console.error("[auth] guest signin error", e);
      setError(e?.message ?? "Guest signin failed");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [withCredentialsFetch, setAndPersist]);

  const signout = useCallback(async () => {
    console.log('[auth] Starting signout');
    setError(null);
    
    try {
      await withCredentialsFetch("/auth/signout", { method: "POST" });
    } catch (e) {
      console.log("[auth] signout error", e);
    } finally {
      await clearSession();
      console.log('[auth] Signout complete');
    }
  }, [withCredentialsFetch, clearSession]);

  return useMemo(() => ({
    user,
    isLoading,
    error,
    isInitialized,
    signup,
    signin,
    guestSignin,
    signout,
    isAuthenticated: !!user,
    isGuest: user?.role === 'guest',
  }), [user, isLoading, error, isInitialized, signup, signin, guestSignin, signout]);
});
