import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ContractorApplicationButtonProps {
  eventId: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function ContractorApplicationButton({ 
  eventId, 
  onPress, 
  disabled = false 
}: ContractorApplicationButtonProps) {
  return (
    <TouchableOpacity 
      style={[styles.button, disabled && styles.buttonDisabled]} 
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
        Apply
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextDisabled: {
    color: '#666',
  },
});