import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/auth-store';

type SubscriptionMapping = {
  stripeSubscriptionId: string;
  userEmail: string;
  userId?: string;
};

export default function StripeSubscriptionMapper() {
  const { user } = useAuth();
  const [mappings, setMappings] = useState<SubscriptionMapping[]>([
    { stripeSubscriptionId: 'sub_1RxfltIArdLpeJ15d5hi7hZy', userEmail: '' },
    { stripeSubscriptionId: 'sub_1Rxfj2IArdLpeJ15iBzFZan6', userEmail: '' },
    { stripeSubscriptionId: 'sub_1RxfbQIArdLpeJ15Enfqm4Eb', userEmail: '' },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const linkSubscriptionMutation = trpc.subscription.stripe.linkExisting.useMutation();

  const updateMapping = (index: number, email: string) => {
    const newMappings = [...mappings];
    newMappings[index].userEmail = email;
    setMappings(newMappings);
  };

  const findUserByEmail = async (email: string): Promise<string | null> => {
    try {
      // Use trpcClient for non-react context
      const { trpcClient } = await import('@/lib/trpc');
      const results = await trpcClient.profile.search.query({ role: 'business_owner', q: email });
      const foundUser = results.items.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      return foundUser?.userId || null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  };

  const processMapping = async (mapping: SubscriptionMapping) => {
    if (!mapping.userEmail.trim()) {
      Alert.alert('Error', 'Please enter a user email');
      return false;
    }

    try {
      // Find user by email
      const userId = await findUserByEmail(mapping.userEmail);
      if (!userId) {
        Alert.alert('Error', `User not found with email: ${mapping.userEmail}`);
        return false;
      }

      // Link the subscription
      await linkSubscriptionMutation.mutateAsync({
        stripeSubscriptionId: mapping.stripeSubscriptionId,
      });

      Alert.alert('Success', `Subscription ${mapping.stripeSubscriptionId} linked to user ${mapping.userEmail}`);
      return true;
    } catch (error) {
      console.error('Error processing mapping:', error);
      Alert.alert('Error', `Failed to link subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  const processAllMappings = async () => {
    setIsProcessing(true);
    let successCount = 0;
    
    for (const mapping of mappings) {
      if (mapping.userEmail.trim()) {
        const success = await processMapping(mapping);
        if (success) successCount++;
      }
    }
    
    setIsProcessing(false);
    Alert.alert('Complete', `Successfully linked ${successCount} subscriptions`);
  };

  if (user?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Access Denied' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Admin access required</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Stripe Subscription Mapper' }} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Map Existing Stripe Subscriptions</Text>
          <Text style={styles.subtitle}>
            Enter the email addresses of users who should be linked to these Stripe subscriptions.
          </Text>
        </View>

        {mappings.map((mapping, index) => (
          <View key={mapping.stripeSubscriptionId} style={styles.mappingCard}>
            <Text style={styles.subscriptionId}>Subscription ID:</Text>
            <Text style={styles.subscriptionIdValue}>{mapping.stripeSubscriptionId}</Text>
            
            <Text style={styles.label}>User Email:</Text>
            <TextInput
              style={styles.input}
              value={mapping.userEmail}
              onChangeText={(text) => updateMapping(index, text)}
              placeholder="Enter user email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => processMapping(mapping)}
              disabled={isProcessing || !mapping.userEmail.trim()}
            >
              <Text style={styles.linkButtonText}>Link This Subscription</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.processAllButton, isProcessing && styles.disabledButton]}
          onPress={processAllMappings}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.processAllButtonText}>Process All Mappings</Text>
          )}
        </TouchableOpacity>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Instructions:</Text>
          <Text style={styles.instructionsText}>
            1. Enter the email address of each user who should be linked to the corresponding Stripe subscription.
          </Text>
          <Text style={styles.instructionsText}>
            2. Click &ldquo;Link This Subscription&rdquo; for individual mappings, or &ldquo;Process All Mappings&rdquo; to do them all at once.
          </Text>
          <Text style={styles.instructionsText}>
            3. The system will automatically detect the subscription tier and billing cycle from Stripe.
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
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
    lineHeight: 22,
  },
  mappingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  subscriptionIdValue: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#333',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  linkButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  linkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  processAllButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  processAllButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructions: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: '600',
  },
});