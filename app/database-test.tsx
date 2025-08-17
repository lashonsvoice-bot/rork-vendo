import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';

export default function DatabaseTestScreen() {
  const [testResult, setTestResult] = useState<any>(null);
  const [sampleData, setSampleData] = useState<any>(null);
  const [queryResult, setQueryResult] = useState<any>(null);

  const testConnectionMutation = trpc.database.testConnection.useQuery(undefined, {
    enabled: false,
  });

  const createSampleDataMutation = trpc.database.createSampleData.useMutation();
  const querySampleDataQuery = trpc.database.querySampleData.useQuery(
    { limit: 5 },
    { enabled: false }
  );

  const handleTestConnection = async () => {
    try {
      console.log('🧪 Testing database connection...');
      const result = await testConnectionMutation.refetch();
      setTestResult(result.data);
      
      if (result.data?.success) {
        Alert.alert('Success', 'Database connection test passed!');
      } else {
        Alert.alert('Error', result.data?.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      Alert.alert('Error', 'Failed to test connection');
    }
  };

  const handleCreateSampleData = async () => {
    try {
      console.log('🌱 Creating sample data...');
      const result = await createSampleDataMutation.mutateAsync({ count: 5 });
      setSampleData(result);
      
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', result.error || 'Failed to create sample data');
      }
    } catch (error) {
      console.error('Create sample data error:', error);
      Alert.alert('Error', 'Failed to create sample data');
    }
  };

  const handleQueryData = async () => {
    try {
      console.log('🔍 Querying sample data...');
      const result = await querySampleDataQuery.refetch();
      setQueryResult(result.data);
      
      if (result.data?.success) {
        Alert.alert('Success', `Found ${result.data.count} documents`);
      } else {
        Alert.alert('Error', result.data?.error || 'Query failed');
      }
    } catch (error) {
      console.error('Query error:', error);
      Alert.alert('Error', 'Failed to query data');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Database Test',
          headerStyle: { backgroundColor: '#f8f9fa' },
          headerTitleStyle: { fontWeight: '600' }
        }} 
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗄️ Couchbase Connection Test</Text>
          <Text style={styles.description}>
            Test the connection to your Couchbase cluster and perform basic operations.
          </Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleTestConnection}
            disabled={testConnectionMutation.isFetching}
          >
            <Text style={styles.buttonText}>
              {testConnectionMutation.isFetching ? 'Testing...' : 'Test Connection'}
            </Text>
          </TouchableOpacity>
          
          {testResult && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Connection Test Result:</Text>
              <Text style={[
                styles.resultStatus, 
                { color: testResult.success ? '#28a745' : '#dc3545' }
              ]}>
                {testResult.success ? '✅ Success' : '❌ Failed'}
              </Text>
              {testResult.message && (
                <Text style={styles.resultMessage}>{testResult.message}</Text>
              )}
              {testResult.error && (
                <Text style={styles.errorText}>{testResult.error}</Text>
              )}
              {testResult.details && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsTitle}>Details:</Text>
                  <Text style={styles.detailsText}>
                    Collection: {testResult.details.collectionPath}
                  </Text>
                  <Text style={styles.detailsText}>
                    Ping: {testResult.details.ping ? '✅' : '❌'}
                  </Text>
                  <Text style={styles.detailsText}>
                    Insert: {testResult.details.insert ? '✅' : '❌'}
                  </Text>
                  <Text style={styles.detailsText}>
                    Retrieve: {testResult.details.retrieve ? '✅' : '❌'}
                  </Text>
                  <Text style={styles.detailsText}>
                    Cleanup: {testResult.details.cleanup ? '✅' : '❌'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌱 Sample Data Operations</Text>
          <Text style={styles.description}>
            Create sample documents and test query operations.
          </Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleCreateSampleData}
            disabled={createSampleDataMutation.isPending}
          >
            <Text style={styles.buttonText}>
              {createSampleDataMutation.isPending ? 'Creating...' : 'Create Sample Data'}
            </Text>
          </TouchableOpacity>
          
          {sampleData && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Sample Data Result:</Text>
              <Text style={[
                styles.resultStatus, 
                { color: sampleData.success ? '#28a745' : '#dc3545' }
              ]}>
                {sampleData.success ? '✅ Success' : '❌ Failed'}
              </Text>
              <Text style={styles.resultMessage}>{sampleData.message}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Query Sample Data</Text>
          <Text style={styles.description}>
            Query the sample documents from the database.
          </Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleQueryData}
            disabled={querySampleDataQuery.isFetching}
          >
            <Text style={styles.buttonText}>
              {querySampleDataQuery.isFetching ? 'Querying...' : 'Query Sample Data'}
            </Text>
          </TouchableOpacity>
          
          {queryResult && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Query Result:</Text>
              <Text style={[
                styles.resultStatus, 
                { color: queryResult.success ? '#28a745' : '#dc3545' }
              ]}>
                {queryResult.success ? '✅ Success' : '❌ Failed'}
              </Text>
              {queryResult.success && (
                <>
                  <Text style={styles.resultMessage}>
                    Found {queryResult.count} documents
                  </Text>
                  {queryResult.data && queryResult.data.length > 0 && (
                    <View style={styles.documentsContainer}>
                      <Text style={styles.documentsTitle}>Sample Documents:</Text>
                      {queryResult.data.slice(0, 3).map((doc: any, index: number) => (
                        <View key={index} style={styles.documentItem}>
                          <Text style={styles.documentName}>{doc.name}</Text>
                          <Text style={styles.documentDescription}>{doc.description}</Text>
                          <Text style={styles.documentMeta}>
                            Category: {doc.category} | Value: {doc.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
              {queryResult.error && (
                <Text style={styles.errorText}>{queryResult.error}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>ℹ️ Database Information</Text>
          <Text style={styles.infoText}>
            • Cluster: cb.3ffpkfl5uy0wwzky.cloud.couchbase.com
          </Text>
          <Text style={styles.infoText}>
            • Bucket: travel-sample
          </Text>
          <Text style={styles.infoText}>
            • Username: Revovend1
          </Text>
          <Text style={styles.infoText}>
            • Connection: HTTP REST API (Expo Go compatible)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  resultStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 8,
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 4,
  },
  documentsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  documentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  documentItem: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: '#868e96',
  },
  infoSection: {
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 4,
  },
});