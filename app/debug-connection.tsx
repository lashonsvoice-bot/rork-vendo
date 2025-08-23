import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Server, Save, Trash2, Globe } from 'lucide-react-native';
import { getBaseUrl, testTRPCConnection, trpc } from '@/lib/trpc';
import Constants from 'expo-constants';

interface ConnectionStatus {
  baseUrl: string;
  isConnected: boolean;
  lastChecked: Date;
  error?: string;
  responseTime?: number;
}

export default function DebugConnectionScreen() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [trpcTest, setTrpcTest] = useState<{ success: boolean; error?: string } | null>(null);
  const [baseUrlInput, setBaseUrlInput] = useState<string>('');

  const checkConnection = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const baseUrl = getBaseUrl();
      const isConnected = await testTRPCConnection();
      const responseTime = Date.now() - startTime;

      setStatus({
        baseUrl,
        isConnected,
        lastChecked: new Date(),
        responseTime,
      });
      setBaseUrlInput(baseUrl);
    } catch (error) {
      const baseUrl = getBaseUrl();
      const responseTime = Date.now() - startTime;

      setStatus({
        baseUrl,
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      });
      setBaseUrlInput(baseUrl);
    } finally {
      setIsLoading(false);
    }
  };

  const hiMutation = trpc.example.hi.useMutation({
    onSuccess: (result) => {
      setTrpcTest({ success: true });
      Alert.alert('Success', `tRPC call successful: ${result.hello} at ${result.date}`);
    },
    onError: (error) => {
      const errorMessage = error.message || 'Unknown error';
      setTrpcTest({ success: false, error: errorMessage });
      Alert.alert('Error', `tRPC call failed: ${errorMessage}`);
    }
  });

  const testTRPCQuery = () => {
    hiMutation.mutate({ name: 'Debug Test' });
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const saveOverride = () => {
    const value = baseUrlInput.trim();
    if (!value) {
      Alert.alert('Invalid URL', 'Please enter a valid base URL (e.g., http://localhost:3000)');
      return;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('rork.apiBaseUrl', value);
        Alert.alert('Saved', 'Base URL override saved for web. Retesting...');
        checkConnection();
      } catch (e) {
        Alert.alert('Error', 'Failed to save to localStorage');
      }
    } else {
      try {
        (globalThis as unknown as { RORK_API_BASE_URL?: string }).RORK_API_BASE_URL = value;
        Alert.alert('Saved', 'Base URL override set for this session. Some requests may require app reload.');
        checkConnection();
      } catch {
        Alert.alert('Error', 'Failed to set global override');
      }
    }
  };

  const clearOverride = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.removeItem('rork.apiBaseUrl');
      Alert.alert('Cleared', 'Removed web base URL override. Retesting...');
      checkConnection();
    } else {
      delete (globalThis as unknown as { RORK_API_BASE_URL?: string }).RORK_API_BASE_URL;
      Alert.alert('Cleared', 'Removed native base URL override. Retesting...');
      checkConnection();
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw size={24} color="#666" />;
    if (!status) return <AlertTriangle size={24} color="#f59e0b" />;
    return status.isConnected ? 
      <CheckCircle size={24} color="#10b981" /> : 
      <XCircle size={24} color="#ef4444" />;
  };

  const getStatusColor = () => {
    if (!status) return '#f59e0b';
    return status.isConnected ? '#10b981' : '#ef4444';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Server size={32} color="#3b82f6" />
          <Text style={styles.title}>Backend Connection Debug</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            {getStatusIcon()}
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {isLoading ? 'Checking...' : 
               !status ? 'Not tested' :
               status.isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>

          {status && (
            <View style={styles.details}>
              <Text style={styles.detailLabel}>Base URL:</Text>
              <Text style={styles.detailValue}>{status.baseUrl}</Text>
              
              <Text style={styles.detailLabel}>Last Checked:</Text>
              <Text style={styles.detailValue}>{status.lastChecked.toLocaleTimeString()}</Text>
              
              {status.responseTime && (
                <>
                  <Text style={styles.detailLabel}>Response Time:</Text>
                  <Text style={styles.detailValue}>{status.responseTime}ms</Text>
                </>
              )}
              
              {status.error && (
                <>
                  <Text style={styles.detailLabel}>Error:</Text>
                  <Text style={[styles.detailValue, styles.errorText]}>{status.error}</Text>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Environment Info</Text>
          <View style={styles.details}>
            <Text style={styles.detailLabel}>Platform:</Text>
            <Text style={styles.detailValue}>{Platform.OS}</Text>

            <Text style={styles.detailLabel}>Node ENV:</Text>
            <Text style={styles.detailValue}>{process.env.NODE_ENV || 'undefined'}</Text>

            <Text style={styles.detailLabel}>__DEV__:</Text>
            <Text style={styles.detailValue}>{__DEV__ ? 'true' : 'false'}</Text>

            <Text style={styles.detailLabel}>Host URI:</Text>
            <Text style={styles.detailValue}>
              {(Constants as any)?.expoConfig?.hostUri || 'N/A'}
            </Text>

            {Platform.OS === 'web' && typeof window !== 'undefined' && (
              <>
                <Text style={styles.detailLabel}>Window Origin:</Text>
                <Text style={styles.detailValue}>{window.location.origin}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Configure Base URL</Text>
          <View style={styles.inputRow}>
            <Globe size={18} color="#6b7280" />
            <TextInput
              testID="base-url-input"
              style={styles.input}
              value={baseUrlInput}
              onChangeText={setBaseUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://localhost:3000"
            />
          </View>
          <View style={styles.actionsInline}>
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={saveOverride} testID="save-base-url">
              <Save size={18} color="white" />
              <Text style={styles.buttonText}>Save Override</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearOverride} testID="clear-base-url">
              <Trash2 size={18} color="white" />
              <Text style={styles.buttonText}>Clear Override</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helpText}>Tip: On web you can also set localStorage key rork.apiBaseUrl. Use "same-origin" to call the same host the app is served from.</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={checkConnection}
            disabled={isLoading}
          >
            <RefreshCw size={20} color="white" />
            <Text style={styles.buttonText}>Test Connection</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={testTRPCQuery}
            disabled={!status?.isConnected}
          >
            <Server size={20} color="#3b82f6" />
            <Text style={[styles.buttonText, { color: '#3b82f6' }]}>Test tRPC Query</Text>
          </TouchableOpacity>
        </View>

        {trpcTest && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>tRPC Test Result</Text>
            <View style={styles.statusRow}>
              {trpcTest.success ? 
                <CheckCircle size={20} color="#10b981" /> : 
                <XCircle size={20} color="#ef4444" />
              }
              <Text style={[styles.statusText, { 
                color: trpcTest.success ? '#10b981' : '#ef4444' 
              }]}>
                {trpcTest.success ? 'Success' : 'Failed'}
              </Text>
            </View>
            {trpcTest.error && (
              <Text style={[styles.detailValue, styles.errorText]}>{trpcTest.error}</Text>
            )}
          </View>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Troubleshooting</Text>
          <Text style={styles.instructionsText}>
            If the connection fails:
          </Text>
          <Text style={styles.instructionsText}>
            1. Make sure the backend server is running on port 3000
          </Text>
          <Text style={styles.instructionsText}>
            2. Run: node start-backend.js
          </Text>
          <Text style={styles.instructionsText}>
            3. Check that no other service is using port 3000
          </Text>
          <Text style={styles.instructionsText}>
            4. Verify your .env file has correct settings
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  details: {
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    fontFamily: 'monospace',
  },
  actions: {
    gap: 12,
    marginBottom: 16,
  },
  actionsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  instructions: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  helpText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 4,
  },
});