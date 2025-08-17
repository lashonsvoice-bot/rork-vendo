import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import TaxDashboard from '@/components/TaxDashboard';
import { useAuth } from '@/hooks/auth-store';

export default function TaxComplianceScreen() {
  const { user } = useAuth();

  if (user?.role !== 'business_owner') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Tax Compliance',
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      <TaxDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});