/**
 * Debug Ambassador Login
 * Direct testing of ambassador authentication
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
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { trpcClient } from '@/lib/trpc';

export default function DebugAmbassadorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('lashonsvoice@gmail.com');
  const [password, setPassword] = useState('Welcome123!');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testDirectLogin = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      addLog('Starting direct login test...');
      addLog(`Email: "${email}" (length: ${email.length})`);
      addLog(`Password: "${password}" (length: ${password.length})`);
      
      // Check for spaces
      if (email !== email.trim()) {
        addLog('⚠️ WARNING: Email has leading/trailing spaces!');
        addLog(`Trimmed email: "${email.trim()}"`);
      }
      
      if (password !== password.trim()) {
        addLog('⚠️ WARNING: Password has leading/trailing spaces!');
        addLog(`Trimmed password: "${password.trim()}"`);
      }
      
      // Make direct tRPC call
      addLog('Making tRPC call to ambassador.auth.login...');
      
      const result = await trpcClient.ambassador.auth.login.mutate({
        email: email.trim(),
        password: password.trim()
      });
      
      addLog('✅ Login successful!');
      addLog(`Result: ${JSON.stringify(result, null, 2)}`);
      
      if (result?.success) {
        Alert.alert(
          'Success!', 
          'Login successful! You can now use these credentials in the main login screen.',
          [
            { text: 'Go to Login', onPress: () => router.push('/ambassador-login' as any) },
            { text: 'Stay Here' }
          ]
        );
      }
      
    } catch (error: any) {
      addLog('❌ Login failed!');
      addLog(`Error: ${error?.message || 'Unknown error'}`);
      
      if (error?.data?.code) {
        addLog(`Error code: ${error.data.code}`);
      }
      
      if (error?.data?.httpStatus) {
        addLog(`HTTP status: ${error.data.httpStatus}`);
      }
      
      // Try to parse error details
      if (error?.message?.includes('UNAUTHORIZED')) {
        addLog('Issue: Invalid credentials');
        addLog('Solution: Run backend/scripts/ensure-ambassador-account.js');
      } else if (error?.message?.includes('fetch')) {
        addLog('Issue: Cannot connect to backend');
        addLog('Solution: Make sure backend is running (npm run backend)');
      }
      
      Alert.alert('Login Failed', error?.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const testBackendConnection = async () => {
    clearLogs();
    setIsLoading(true);
    
    try {
      addLog('Testing backend connection...');
      
      // Try a simple health check
      const baseUrl = Platform.OS === 'web' 
        ? 'http://localhost:3000' 
        : 'http://10.0.2.2:3000'; // Android emulator
      
      addLog(`Base URL: ${baseUrl}`);
      
      const response = await fetch(`${baseUrl}/api/health`);
      const text = await response.text();
      
      addLog(`Response status: ${response.status}`);
      addLog(`Response: ${text}`);
      
      if (response.ok) {
        addLog('✅ Backend is reachable!');
      } else {
        addLog('⚠️ Backend returned non-OK status');
      }
      
    } catch (error: any) {
      addLog('❌ Cannot reach backend!');
      addLog(`Error: ${error?.message}`);
      addLog('Make sure backend is running: npm run backend');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCredentials = () => {
    const creds = `Email: ${email}\nPassword: ${password}`;
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(creds);
      Alert.alert('Copied', 'Credentials copied to clipboard');
    } else {
      Alert.alert('Credentials', creds);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Debug Ambassador Login</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Credentials</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email:</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password:</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          
          <TouchableOpacity
            style={styles.button}
            onPress={copyCredentials}
          >
            <Text style={styles.buttonText}>Copy Credentials</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tests</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={testDirectLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Test Direct Login</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={testBackendConnection}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Backend Connection</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/ambassador-login' as any)}
          >
            <Text style={styles.buttonText}>Go to Ambassador Login</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <View style={styles.logsHeader}>
            <Text style={styles.sectionTitle}>Logs</Text>
            <TouchableOpacity onPress={clearLogs}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.logsContainer}>
            {logs.length === 0 ? (
              <Text style={styles.logEntry}>No logs yet. Run a test to see output.</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logEntry}>{log}</Text>
              ))
            )}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructions}>
            1. Make sure backend is running: npm run backend{'\n'}
            2. Run: node backend/scripts/ensure-ambassador-account.js{'\n'}
            3. Test the direct login above{'\n'}
            4. If successful, use the same credentials in the main login{'\n'}
            {'\n'}
            Expected credentials:{'\n'}
            Email: lashonsvoice@gmail.com (no spaces!){'\n'}
            Password: Welcome123!
          </Text>
        </View>
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
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
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
    color: '#333',
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#8B4513',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  logsContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 12,
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});