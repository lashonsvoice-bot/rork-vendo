/**
 * Test Ambassador Login
 * Debug screen to test ambassador authentication
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
import { trpcClient } from '@/lib/trpc';

export default function TestAmbassadorLogin() {
  const [email, setEmail] = useState('test@ambassador.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Test Ambassador');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testSignup = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      console.log('[TestAmbassadorLogin] Testing signup...');
      const response = await trpcClient.ambassador.auth.signup.mutate({
        email,
        password,
        name,
        phone: '1234567890'
      });
      console.log('[TestAmbassadorLogin] Signup response:', response);
      setResult({ type: 'signup', data: response });
      Alert.alert('Success', 'Signup successful!');
    } catch (error: any) {
      console.error('[TestAmbassadorLogin] Signup error:', error);
      setResult({ type: 'error', data: error });
      Alert.alert('Error', error?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testLogin = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      console.log('[TestAmbassadorLogin] Testing login...');
      const response = await trpcClient.ambassador.auth.login.mutate({
        email,
        password
      });
      console.log('[TestAmbassadorLogin] Login response:', response);
      setResult({ type: 'login', data: response });
      Alert.alert('Success', 'Login successful!');
    } catch (error: any) {
      console.error('[TestAmbassadorLogin] Login error:', error);
      setResult({ type: 'error', data: error });
      Alert.alert('Error', error?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testBackendConnection = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      console.log('[TestAmbassadorLogin] Testing backend connection...');
      const response = await trpcClient.example.hi.query();
      console.log('[TestAmbassadorLogin] Backend response:', response);
      setResult({ type: 'connection', data: response });
      Alert.alert('Success', 'Backend is connected!');
    } catch (error: any) {
      console.error('[TestAmbassadorLogin] Connection error:', error);
      setResult({ type: 'error', data: error });
      Alert.alert('Error', 'Backend connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ambassador Login Test</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Credentials</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email"
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
              placeholder="Enter password"
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name (for signup)</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.connectionButton]}
            onPress={testBackendConnection}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Test Backend Connection</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.signupButton]}
            onPress={testSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Test Signup</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
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

        {result && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Result</Text>
            <View style={[
              styles.resultBox,
              result.type === 'error' && styles.errorBox
            ]}>
              <Text style={styles.resultType}>{result.type.toUpperCase()}</Text>
              <ScrollView style={styles.resultScroll}>
                <Text style={styles.resultText}>
                  {JSON.stringify(result.data, null, 2)}
                </Text>
              </ScrollView>
            </View>
          </View>
        )}
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
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  connectionButton: {
    backgroundColor: '#6B7280',
  },
  signupButton: {
    backgroundColor: '#10B981',
  },
  loginButton: {
    backgroundColor: '#8B4513',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultSection: {
    marginTop: 20,
  },
  resultBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 300,
  },
  errorBox: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  resultType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  resultScroll: {
    maxHeight: 250,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
});