import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { EventsProvider } from "@/hooks/events-store";
import { UserProvider } from "@/hooks/user-store";
import { CommunicationProvider } from "@/hooks/communication-store";
import { NotificationProvider } from "@/hooks/notifications-store";
import { SubscriptionProvider } from "@/hooks/subscription-store";
import { ThemeProvider } from "@/hooks/theme-store";
import { trpc, createTRPCClient, testTRPCConnection } from "@/lib/trpc";
import { AuthProvider } from "@/hooks/auth-store";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthGuard } from "@/components/AuthGuard";
import { WalletProvider } from "@/hooks/wallet-store";
import { SplashProvider, useSplash } from "@/hooks/splash-store";
import { VideoSplashScreen } from "@/components/VideoSplashScreen";
import UpgradeSticker from "@/components/UpgradeSticker";
import { AmbassadorProvider } from "@/hooks/ambassador-store";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        console.log('[QueryClient] Query retry:', failureCount, error?.message);
        if (error && 'data' in error && (error as any).data?.code === 'UNAUTHORIZED') {
          return false;
        }
        // Don't retry network errors more than once
        if (error?.message?.includes('Network error') || error?.message?.includes('Failed to fetch')) {
          return failureCount < 1;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});

const trpcClient = createTRPCClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/role-selection" options={{ headerShown: false }} />

      <Stack.Screen name="auth/forgot-password" options={{ headerShown: true, title: "Forgot Password" }} />
      <Stack.Screen name="auth/reset-password" options={{ headerShown: true, title: "Reset Password" }} />
      <Stack.Screen name="messages" options={{ headerShown: true, title: "Messages" }} />
      <Stack.Screen name="proposal-test" options={{ headerShown: true, title: "Proposal Test" }} />
      <Stack.Screen name="training-materials" options={{ headerShown: true, title: "Training Materials" }} />
      <Stack.Screen name="profile-edit" options={{ headerShown: true, title: "Edit Profile" }} />
      <Stack.Screen name="guest-directories" options={{ headerShown: true, title: "Public Directories" }} />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: "Notifications" }} />
      <Stack.Screen name="notification-settings" options={{ headerShown: true, title: "Notification Settings" }} />
      <Stack.Screen name="subscription" options={{ headerShown: true, title: "Subscription" }} />
      <Stack.Screen name="wallet" options={{ headerShown: true, title: "Wallet" }} />
      <Stack.Screen name="terms" options={{ headerShown: true, title: "Terms & Conditions" }} />
      <Stack.Screen name="privacy" options={{ headerShown: true, title: "Privacy Policy" }} />
      <Stack.Screen name="contact" options={{ headerShown: true, title: "Contact" }} />
      <Stack.Screen name="debug-connection" options={{ headerShown: true, title: "Connection Debug" }} />
      <Stack.Screen name="ambassador-login" options={{ headerShown: false }} />
      <Stack.Screen name="ambassador-dashboard" options={{ headerShown: true, title: "Ambassador Dashboard" }} />
      <Stack.Screen name="test-ambassador" options={{ headerShown: true, title: "Test Ambassador" }} />

    </Stack>
  );
}

function AppContent() {
  const { showSplash, isLoading, hideSplash } = useSplash();

  if (isLoading) {
    return null; // Or a simple loading indicator
  }

  if (showSplash) {
    return (
      <VideoSplashScreen 
        onFinish={hideSplash}
        duration={6000}
      />
    );
  }

  return (
    <AuthGuard>
      <RootLayoutNav />
      <UpgradeSticker />
    </AuthGuard>
  );
}

export default function RootLayout() {
  // Test tRPC connection on app start
  useEffect(() => {
    const testConnection = async () => {
      console.log('[RootLayout] Testing tRPC connection on app start...');
      const isConnected = await testTRPCConnection();
      console.log('[RootLayout] Initial connection test result:', isConnected);
      if (!isConnected) {
        console.warn('[RootLayout] ⚠️ Backend server appears to be unavailable. Some features may not work.');
      }
    };
    
    testConnection();
  }, []);
  
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <ThemeProvider>
            <SplashProvider>
              <AuthProvider>
                <UserProvider>
                  <SubscriptionProvider>
                    <NotificationProvider>
                      <WalletProvider>
                        <AmbassadorProvider>
                          <CommunicationProvider>
                            <EventsProvider>
                              <GestureHandlerRootView style={{ flex: 1 }} testID="gesture-root">
                                <AppContent />
                              </GestureHandlerRootView>
                            </EventsProvider>
                          </CommunicationProvider>
                        </AmbassadorProvider>
                      </WalletProvider>
                    </NotificationProvider>
                  </SubscriptionProvider>
                </UserProvider>
              </AuthProvider>
            </SplashProvider>
          </ThemeProvider>
        </trpc.Provider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}