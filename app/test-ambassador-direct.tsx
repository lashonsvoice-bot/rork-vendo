/**
 * Direct test page for ambassador login
 * This bypasses the role selection and tests the login directly
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';

export default function TestAmbassadorDirectScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testLogin = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const email = 'lashonsvoice@gmail.com';
    const password = 'Welcome123!';

    console.log('[TestDirect] Starting login test...');
    console.log('[TestDirect] Email:', email);
    console.log('[TestDirect] Password:', password);

    try {
      // Direct tRPC call
      const loginMutation = trpc.ambassador.auth.login.useMutation();
      const loginResult = await loginMutation.mutateAsync({
        email,
        password
      });

      console.log('[TestDirect] Login result:', loginResult);
      setResult(loginResult);

      if (loginResult?.success) {
        Alert.alert(
          'Success!',
          'Login successful! You can now navigate to the ambassador dashboard.',
          [
            { text: 'Stay Here', style: 'cancel' },
            { 
              text: 'Go to Dashboard', 
              onPress: () => router.push('/ambassador-dashboard' as any) 
            }
          ]
        );
      } else {
        setError('Login failed - result not successful');
      }
    } catch (err: any) {
      console.error('[TestDirect] Login error:', err);
      setError(err?.message || 'Unknown error occurred');
      
      Alert.alert(
        'Login Failed',
        `Error: ${err?.message || 'Unknown error'}`,
        [
          { text: 'OK' },
          {
            text: 'Check Backend',
            onPress: async () => {
              try {
                const response = await fetch('http://localhost:3000/api');
                const text = await response.text();
                Alert.alert('Backend Status', `Response: ${text}`);
              } catch (_e) {
                Alert.alert('Backend Error', 'Cannot connect to backend at http://localhost:3000');
              }
            }
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const runDatabaseScript = () => {
    Alert.alert(
      'Run Database Script',
      'To ensure the ambassador account exists:\n\n1. Open terminal\n2. Run: node backend/scripts/ensure-ambassador-account.js\n3. Then try login again',
      [{ text: 'OK' }]
    );
  };

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/api');
      const text = await response.text();
      Alert.alert('Backend Status', `Connected!\nResponse: ${text}`);
    } catch (_e) {
      Alert.alert(
        'Backend Not Running',
        'Cannot connect to backend.\n\nMake sure to run: npm run backend',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ambassador Login Direct Test</Text>
        <Text style={styles.subtitle}>
          This page tests the ambassador login directly without going through role selection
        </Text>

        <View style={styles.credentials}>
          <Text style={styles.credentialsTitle}>Test Credentials:</Text>
          <Text style={styles.credentialItem}>📧 Email: lashonsvoice@gmail.com</Text>
          <Text style={styles.credentialItem}>🔑 Password: Welcome123!</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={checkBackendStatus}
        >
          <Text style={styles.secondaryButtonText}>Check Backend Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={runDatabaseScript}
        >
          <Text style={styles.secondaryButtonText}>Setup Instructions</Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>❌ Error:</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {result && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>✅ Login Result:</Text>
            <Text style={styles.resultText}>{JSON.stringify(result, null, 2)}</Text>
          </View>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Troubleshooting Steps:</Text>
          <Text style={styles.instructionItem}>1. Make sure backend is running (npm run backend)</Text>
          <Text style={styles.instructionItem}>2. Run: node backend/scripts/ensure-ambassador-account.js</Text>
          <Text style={styles.instructionItem}>3. Click &quot;Test Login&quot; button above</Text>
          <Text style={styles.instructionItem}>4. If successful, go to ambassador dashboard</Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  credentials: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  credentialsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  credentialItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#8B4513',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#7F1D1D',
  },
  resultBox: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 12,
    color: '#064E3B',
    fontFamily: 'monospace',
  },
  instructions: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  instructionItem: {
    fontSize: 13,
    color: '#78350F',
    marginBottom: 4,
  },
  backButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});