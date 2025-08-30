/**
 * Test Ambassador Authentication
 * Debug page to test ambassador login functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { trpcClient } from '@/lib/trpc';

export default function TestAmbassadorAuth() {
  const router = useRouter();
  const [email, setEmail] = useState('lashonsvoice@gmail.com');
  const [password, setPassword] = useState('Welcome123!');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testLogin = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('[TestAuth] Attempting login with:', { email, password: '***' });
      
      const response = await trpcClient.ambassador.auth.login.mutate({
        email,
        password
      });

      console.log('[TestAuth] Login response:', response);
      setResult(response);

      if (response?.success) {
        Alert.alert(
          'Success!',
          'Login successful! You can now navigate to the ambassador dashboard.',
          [
            { text: 'Go to Dashboard', onPress: () => router.push('/ambassador-dashboard' as any) },
            { text: 'Stay Here', style: 'cancel' }
          ]
        );
      } else {
        setError('Login failed - response not successful');
      }
    } catch (err: any) {
      console.error('[TestAuth] Login error:', err);
      setError(err?.message || 'Unknown error occurred');
      
      Alert.alert(
        'Login Failed',
        err?.message || 'Unknown error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const runVerificationScript = () => {
    Alert.alert(
      'Run Verification Script',
      'To fix the ambassador account, run this command in your terminal:\n\nnode backend/scripts/verify-ambassador-login.js\n\nThis will create/update the account with the correct credentials.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Test Ambassador Authentication</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Credentials</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={testLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Test Login</Text>
            )}
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorSection}>
            <Text style={styles.errorTitle}>Error:</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {result && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>Result:</Text>
            <Text style={styles.resultText}>
              {JSON.stringify(result, null, 2)}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={runVerificationScript}
          >
            <Text style={styles.buttonText}>How to Fix Account</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Expected Credentials:</Text>
            <Text style={styles.infoText}>Email: lashonsvoice@gmail.com</Text>
            <Text style={styles.infoText}>Password: Welcome123!</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Backend Requirements:</Text>
            <Text style={styles.infoText}>1. Backend server must be running</Text>
            <Text style={styles.infoText}>2. SQLite database must be initialized</Text>
            <Text style={styles.infoText}>3. Ambassador tables must exist</Text>
            <Text style={styles.infoText}>4. Account must be created with correct password</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.tertiaryButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Back</Text>
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
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: '#666',
    marginBottom: 16,
  },
  tertiaryButton: {
    backgroundColor: '#999',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorSection: {
    backgroundColor: '#fee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c00',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#800',
  },
  resultSection: {
    backgroundColor: '#efe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#cfc',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#080',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 12,
    color: '#060',
    fontFamily: 'monospace',
  },
  infoBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
});