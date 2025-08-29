/**
 * Test Ambassador Login
 * Debug page to test ambassador authentication
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

export default function TestAmbassadorScreen() {
  const [email, setEmail] = useState('test@ambassador.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Test Ambassador');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testSignup = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('[TestAmbassador] Testing signup...');
      const response = await trpcClient.ambassador.auth.signup.mutate({
        email,
        password,
        name,
        phone: undefined
      });
      console.log('[TestAmbassador] Signup response:', response);
      setResult(response);
      Alert.alert('Success', 'Signup successful!');
    } catch (error: any) {
      console.error('[TestAmbassador] Signup error:', error);
      setResult({ error: error.message || 'Signup failed' });
      Alert.alert('Error', error.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testLogin = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('[TestAmbassador] Testing login...');
      const response = await trpcClient.ambassador.auth.login.mutate({
        email,
        password
      });
      console.log('[TestAmbassador] Login response:', response);
      setResult(response);
      Alert.alert('Success', 'Login successful!');
    } catch (error: any) {
      console.error('[TestAmbassador] Login error:', error);
      setResult({ error: error.message || 'Login failed' });
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Test Ambassador Auth</Text>
        
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name (for signup)</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
            />
          </View>

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
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Result:</Text>
            <Text style={styles.resultText}>
              {JSON.stringify(result, null, 2)}
            </Text>
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
    marginBottom: 20,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
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
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
  },
});