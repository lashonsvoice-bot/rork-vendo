import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';
import { useRouter } from 'expo-router';


interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

// Create a functional wrapper to handle web compatibility issues
export function ErrorBoundary(props: ErrorBoundaryProps) {
  // Use a simple wrapper to avoid window-related errors during SSR
  // Check if we're in a browser environment before rendering the error boundary
  const isBrowser = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
  
  if (!isBrowser) {
    // In SSR or environments where window.addEventListener is not available, just render children without error boundary
    console.log('[ErrorBoundary] Running in SSR mode or window.addEventListener not available, skipping error boundary');
    return <>{props.children}</>;
  }
  
  return <ErrorBoundaryClass {...props} />;
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.retry} />;
      }

      return <DefaultErrorFallback error={this.state.error!} retry={this.retry} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  retry: () => void;
}

function DefaultErrorFallback({ error, retry }: DefaultErrorFallbackProps) {
  const router = useRouter();

  const goHome = () => {
    try {
      router.replace('/(tabs)/(home)');
    } catch (e) {
      console.error('[ErrorBoundary] Failed to navigate home:', e);
    }
  };

  return (
    <View style={styles.container} testID="error-boundary">
      <LinearGradient 
        colors={['#DC2626', '#EF4444']} 
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <AlertTriangle size={64} color="#FFFFFF" />
          </View>
          
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            We&apos;re sorry, but something unexpected happened. Please try again.
          </Text>
          
          <View style={styles.errorDetails}>
            <Text style={styles.errorTitle}>Error Details:</Text>
            <Text style={styles.errorMessage}>{error.message}</Text>
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={retry}
              testID="retry-button"
            >
              <RefreshCw size={20} color="#DC2626" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.homeButton} 
              onPress={goHome}
              testID="home-button"
            >
              <Home size={20} color="#FFFFFF" />
              <Text style={styles.homeText}>Go Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
    marginBottom: 32,
  },
  errorDetails: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    fontFamily: 'monospace',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 8,
  },
  homeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});