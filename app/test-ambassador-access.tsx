/**
 * Test Ambassador Access
 * Quick test page to verify ambassador login functionality
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
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';

export default function TestAmbassadorAccess() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testLogin = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('[TestAmbassador] Starting login test...');
      
      // Test the login mutation
      const loginResult = await trpc.ambassador.auth.login.useMutation().mutateAsync({
        email: 'lashonsvoice@gmail.com',
        password: 'Welcome123!'
      });
      
      console.log('[TestAmbassador] Login result:', loginResult);
      setResult(loginResult);
      
      if (loginResult.success) {
        Alert.alert(
          '✅ Success!', 
          `Ambassador login successful!\n\nName: ${loginResult.ambassador.name}\nReferral Code: ${loginResult.ambassador.referralCode}\n\nYou can now access the Ambassador Dashboard.`
        );
      } else {
        Alert.alert('❌ Login Failed', 'The login was not successful.');
      }
    } catch (error: any) {
      console.error('[TestAmbassador] Error:', error);
      setResult({ error: error.message || 'Unknown error' });
      Alert.alert(
        '❌ Error',
        error.message || 'Failed to login. Please check the backend is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const setupAccount = async () => {
    Alert.alert(
      'Setup Instructions',
      'To set up the ambassador account:\n\n1. Make sure the backend is running\n2. Run: node backend/scripts/setup-ambassador-account.js\n3. This will create/update the account with:\n   Email: lashonsvoice@gmail.com\n   Password: Welcome123!\n\n4. Then try logging in again.'
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Test Ambassador Access' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Ambassador Access Test</Text>
            <Text style={styles.subtitle}>
              Test login for lashonsvoice@gmail.com
            </Text>
          </View>

          <View style={styles.credentials}>
            <Text style={styles.credentialTitle}>Test Credentials:</Text>
            <View style={styles.credentialItem}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>lashonsvoice@gmail.com</Text>
            </View>
            <View style={styles.credentialItem}>
              <Text style={styles.label}>Password:</Text>
              <Text style={styles.value}>Welcome123!</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={testLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Test Ambassador Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={setupAccount}
          >
            <Text style={styles.secondaryButtonText}>Setup Instructions</Text>
          </TouchableOpacity>

          {result && (
            <View style={styles.result}>
              <Text style={styles.resultTitle}>Result:</Text>
              <ScrollView style={styles.resultContent}>
                <Text style={styles.resultText}>
                  {JSON.stringify(result, null, 2)}
                </Text>
              </ScrollView>
            </View>
          )}

          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>How to Access Ambassador Portal:</Text>
            <Text style={styles.instruction}>1. Go to the main app home screen</Text>
            <Text style={styles.instruction}>2. Select &quot;Ambassador Program&quot; role</Text>
            <Text style={styles.instruction}>3. Click &quot;Go to Ambassador Login&quot;</Text>
            <Text style={styles.instruction}>4. Enter the credentials above</Text>
            <Text style={styles.instruction}>5. Access the Ambassador Dashboard</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  credentials: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  credentialTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  credentialItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
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
  result: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resultContent: {
    maxHeight: 200,
  },
  resultText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  instructions: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 14,
    color: '#047857',
    marginBottom: 6,
    paddingLeft: 8,
  },
});