import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/auth-store';

export default function StripeTestScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const { user } = useAuth();

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testStripeCheckout = async () => {
    if (!user || user.role !== 'business_owner') {
      Alert.alert('Error', 'You must be logged in as a business owner to test Stripe');
      return;
    }

    setIsLoading(true);
    addResult('Starting Stripe checkout test...');

    try {
      // Test creating a checkout session
      const response = await fetch('/api/trpc/subscription.stripe.createCheckout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            tier: 'starter',
            billingCycle: 'monthly'
          }
        })
      });

      addResult(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        addResult(`Error response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      addResult(`Response data: ${JSON.stringify(data, null, 2)}`);

      if (data.result?.data?.url) {
        addResult('✅ Checkout URL created successfully!');
        addResult(`URL: ${data.result.data.url}`);
        
        Alert.alert(
          'Success!',
          'Stripe checkout URL created successfully. Would you like to open it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open', 
              onPress: () => {
                try {
                  const Linking = require('react-native').Linking;
                  Linking.openURL(data.result.data.url);
                } catch (e) {
                  console.log('Open URL error', e);
                }
              }
            }
          ]
        );
      } else {
        addResult('❌ No checkout URL in response');
      }
    } catch (error) {
      console.error('Stripe test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addResult(`❌ Error: ${errorMessage}`);
      Alert.alert('Test Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const testStripeConfig = async () => {
    setIsLoading(true);
    addResult('Testing Stripe configuration...');

    try {
      // Test if Stripe is configured
      const response = await fetch('/api/trpc/subscription.stripe.getStatus', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      addResult(`Config test status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        addResult(`Config response: ${JSON.stringify(data, null, 2)}`);
        addResult('✅ Stripe configuration test passed');
      } else {
        const errorText = await response.text();
        addResult(`❌ Config test failed: ${errorText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addResult(`❌ Config test error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Stripe Test' }} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Stripe Integration Test</Text>
          
          {user ? (
            <View style={styles.userInfo}>
              <Text style={styles.userText}>User: {user.name || user.email}</Text>
              <Text style={styles.userText}>Role: {user.role}</Text>
            </View>
          ) : (
            <Text style={styles.errorText}>Not logged in</Text>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={testStripeConfig}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Test Stripe Config</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={testStripeCheckout}
              disabled={isLoading || !user || user.role !== 'business_owner'}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Test Checkout Creation</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={clearResults}
              disabled={isLoading}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Clear Results</Text>
            </TouchableOpacity>
          </View>

          {testResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Test Results:</Text>
              <ScrollView style={styles.resultsScroll} nestedScrollEnabled>
                {testResults.map((result, index) => (
                  <Text key={index} style={styles.resultText}>
                    {result}
                  </Text>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  userInfo: {
    backgroundColor: theme.colors.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  userText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.red[500],
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    color: theme.colors.text.primary,
  },
  resultsContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 16,
    maxHeight: 400,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  resultsScroll: {
    maxHeight: 300,
  },
  resultText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});