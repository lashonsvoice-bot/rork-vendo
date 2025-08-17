import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/auth-store';

type EntityType = 'individual' | 'sole_proprietor' | 'partnership' | 'c_corp' | 's_corp' | 'llc' | 'other';

interface W9FormData {
  businessName?: string;
  individualName: string;
  federalTaxClassification: EntityType;
  otherEntityDescription?: string;
  payeeAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  taxpayerIdNumber: string;
  isBackupWithholdingSubject: boolean;
  certificationDate: string;
}

export default function W9Form() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<W9FormData>({
    individualName: user?.name || '',
    federalTaxClassification: 'individual',
    payeeAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    taxpayerIdNumber: '',
    isBackupWithholdingSubject: false,
    certificationDate: new Date().toISOString().split('T')[0],
  });

  const submitW9Mutation = trpc.tax.w9.submit.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'W-9 form submitted successfully');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSubmit = () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!formData.individualName || !formData.taxpayerIdNumber || !formData.payeeAddress.street) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    submitW9Mutation.mutate({
      contractorId: user.id,
      ...formData,
    });
  };

  const updateAddress = (field: keyof typeof formData.payeeAddress, value: string) => {
    setFormData(prev => ({
      ...prev,
      payeeAddress: {
        ...prev.payeeAddress,
        [field]: value,
      },
    }));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Form W-9</Text>
      <Text style={styles.subtitle}>Request for Taxpayer Identification Number and Certification</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Name (as shown on your income tax return) *</Text>
        <TextInput
          style={styles.input}
          value={formData.individualName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, individualName: text }))}
          placeholder="Enter your full name"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Business name/disregarded entity name (if different from above)</Text>
        <TextInput
          style={styles.input}
          value={formData.businessName || ''}
          onChangeText={(text) => setFormData(prev => ({ ...prev, businessName: text }))}
          placeholder="Enter business name (optional)"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Federal tax classification *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.federalTaxClassification}
            onValueChange={(value: EntityType) => 
              setFormData(prev => ({ ...prev, federalTaxClassification: value }))
            }
            style={styles.picker}
          >
            <Picker.Item label="Individual/sole proprietor" value="individual" />
            <Picker.Item label="Sole proprietor" value="sole_proprietor" />
            <Picker.Item label="Partnership" value="partnership" />
            <Picker.Item label="C Corporation" value="c_corp" />
            <Picker.Item label="S Corporation" value="s_corp" />
            <Picker.Item label="LLC" value="llc" />
            <Picker.Item label="Other" value="other" />
          </Picker>
        </View>
      </View>

      {formData.federalTaxClassification === 'other' && (
        <View style={styles.section}>
          <Text style={styles.label}>Other entity description *</Text>
          <TextInput
            style={styles.input}
            value={formData.otherEntityDescription || ''}
            onChangeText={(text) => setFormData(prev => ({ ...prev, otherEntityDescription: text }))}
            placeholder="Describe the entity type"
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        
        <Text style={styles.label}>Street Address *</Text>
        <TextInput
          style={styles.input}
          value={formData.payeeAddress.street}
          onChangeText={(text) => updateAddress('street', text)}
          placeholder="Enter street address"
        />

        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          value={formData.payeeAddress.city}
          onChangeText={(text) => updateAddress('city', text)}
          placeholder="Enter city"
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={styles.input}
              value={formData.payeeAddress.state}
              onChangeText={(text) => updateAddress('state', text)}
              placeholder="State"
              maxLength={2}
            />
          </View>
          
          <View style={styles.halfWidth}>
            <Text style={styles.label}>ZIP Code *</Text>
            <TextInput
              style={styles.input}
              value={formData.payeeAddress.zipCode}
              onChangeText={(text) => updateAddress('zipCode', text)}
              placeholder="ZIP Code"
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Taxpayer Identification Number (SSN or EIN) *</Text>
        <TextInput
          style={styles.input}
          value={formData.taxpayerIdNumber}
          onChangeText={(text) => setFormData(prev => ({ ...prev, taxpayerIdNumber: text }))}
          placeholder="XXX-XX-XXXX or XX-XXXXXXX"
          keyboardType="numeric"
          secureTextEntry
        />
      </View>

      <View style={styles.certificationSection}>
        <Text style={styles.certificationTitle}>Certification</Text>
        <Text style={styles.certificationText}>
          Under penalties of perjury, I certify that:
          {'\n'}1. The number shown on this form is my correct taxpayer identification number
          {'\n'}2. I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding
          {'\n'}3. I am a U.S. citizen or other U.S. person
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitW9Mutation.isPending && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitW9Mutation.isPending}
      >
        <Text style={styles.submitButtonText}>
          {submitW9Mutation.isPending ? 'Submitting...' : 'Submit W-9 Form'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  certificationSection: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  certificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  certificationText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});