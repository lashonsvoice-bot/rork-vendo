import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/auth-store';
import { LinearGradient } from 'expo-linear-gradient';

interface AuthGuardProps {
  children: React.ReactNode;
}

const publicRoutes = [
  '/auth/role-selection',
  '/auth/login', 
  '/auth/signup', 
  '/auth/forgot-password', 
  '/auth/reset-password', 
  '/guest-directories'
];

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading, isInitialized } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  
  const currentPath = '/' + segments.join('/');
  const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));
  const isAuthRoute = currentPath.startsWith('/auth/');
  const isRootRoute = currentPath === '/' || currentPath === '';
  const isTabsRoute = currentPath.startsWith('/(tabs)');
  
  React.useEffect(() => {
    if (!isInitialized || isLoading) {
      return;
    }
    
    console.log('[AuthGuard] Checking route:', currentPath, '| User:', user?.email, user?.role);

    // No user - redirect to role selection unless on public route
    if (!user) {
      if (!isPublicRoute) {
        console.log('[AuthGuard] No user, redirecting to role selection');
        router.replace('/auth/role-selection');
      }
      return;
    }

    // Guest user - redirect to guest directories unless already there
    if (user.role === 'guest') {
      if (!currentPath.startsWith('/guest-directories')) {
        console.log('[AuthGuard] Guest user, redirecting to guest directories');
        router.replace('/guest-directories');
      }
      return;
    }

    // Authenticated user on auth or root route - redirect to home
    if ((isAuthRoute || isRootRoute) && !isTabsRoute) {
      console.log('[AuthGuard] Authenticated user on auth/root route, redirecting to home');
      router.replace('/(tabs)/(home)/');
      return;
    }
  }, [user, isLoading, isInitialized, currentPath, isPublicRoute, isAuthRoute, isRootRoute, isTabsRoute, router]);
  
  if (!isInitialized || isLoading) {
    return (
      <View style={styles.loadingContainer} testID="auth-loading">
        <LinearGradient 
          colors={['#10B981', '#34D399']} 
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </LinearGradient>
      </View>
    );
  }
  
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
  },
  errorGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  errorSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
});