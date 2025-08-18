import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AuthRole = "business_owner" | "contractor" | "event_host" | "admin" | "guest" | "local_vendor";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
}

const STORAGE_KEY = "auth.sessionUser";

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = useCallback(async (email: string, role: AuthRole) => {
    console.log('[auth] Logging in:', email, role);
    setIsLoading(true);
    
    try {
      const newUser: SessionUser = {
        id: Date.now().toString(),
        email,
        name: email.split('@')[0],
        role
      };
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);
      console.log('[auth] Login successful');
      return newUser;
    } catch (e) {
      console.error('[auth] Login failed:', e);
      throw new Error('Login failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('[auth] Logging out');
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setUser(null);
      console.log('[auth] Logout successful');
    } catch (e) {
      console.error('[auth] Logout failed:', e);
    }
  }, []);

  return useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    isGuest: user?.role === 'guest',
  }), [user, isLoading, login, logout]);
});
