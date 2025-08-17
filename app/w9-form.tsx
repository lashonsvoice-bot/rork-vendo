import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import W9Form from '@/components/W9Form';
import { useAuth } from '@/hooks/auth-store';

export default function W9FormScreen() {
  const { user } = useAuth();

  if (user?.role !== 'contractor') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'W-9 Tax Form',
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      <W9Form />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});