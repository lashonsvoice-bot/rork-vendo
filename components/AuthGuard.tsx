import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/auth-store';
import { LinearGradient } from 'expo-linear-gradient';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  
  const currentPath = '/' + segments.join('/');
  const isAuthRoute = currentPath.startsWith('/auth/');
  const isRootRoute = currentPath === '/' || currentPath === '';
  
  React.useEffect(() => {
    if (isLoading) return;
    
    console.log('[AuthGuard] Current path:', currentPath, '| User:', user?.email, user?.role);

    if (!user) {
      if (!isAuthRoute) {
        console.log('[AuthGuard] No user, redirecting to role selection');
        router.replace('/auth/role-selection');
      }
      return;
    }

    if (user.role === 'guest') {
      if (!currentPath.startsWith('/guest-directories')) {
        console.log('[AuthGuard] Guest user, redirecting to guest directories');
        router.replace('/guest-directories');
      }
      return;
    }

    if (isAuthRoute || isRootRoute) {
      console.log('[AuthGuard] Authenticated user, redirecting to home');
      router.replace('/');
      return;
    }
  }, [user, isLoading, currentPath, isAuthRoute, isRootRoute, router]);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer} testID="auth-loading">
        <LinearGradient 
          colors={['#10B981', '#34D399']} 
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>RevoVend</Text>
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
    fontSize: 24,
    fontWeight: '800',
  },
});