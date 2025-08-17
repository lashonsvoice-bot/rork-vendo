import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/auth-store';

export default function TaxDashboard() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const paymentsQuery = trpc.tax.payments.getByBusinessOwner.useQuery({
    businessOwnerId: user?.id || '',
    taxYear: selectedYear,
  });

  const form1099Query = trpc.tax.form1099.getByBusinessOwner.useQuery({
    businessOwnerId: user?.id || '',
    taxYear: selectedYear,
  });

  const generate1099Mutation = trpc.tax.form1099.generate.useMutation({
    onSuccess: (records) => {
      Alert.alert('Success', `Generated ${records.length} 1099 forms`);
      form1099Query.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleGenerate1099s = () => {
    Alert.alert(
      'Generate 1099 Forms',
      `This will generate 1099-NEC forms for all contractors who received $600 or more in ${selectedYear}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate', 
          onPress: () => generate1099Mutation.mutate({ taxYear: selectedYear })
        },
      ]
    );
  };

  const totalPayments = paymentsQuery.data?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const contractorsCount = new Set(paymentsQuery.data?.map(p => p.contractorId)).size;
  const contractors1099Count = form1099Query.data?.length || 0;

  const years = [2024, 2023, 2022, 2021, 2020];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tax Compliance Dashboard</Text>
      
      <View style={styles.yearSelector}>
        <Text style={styles.yearLabel}>Tax Year:</Text>
        <View style={styles.yearButtons}>
          {years.map(year => (
            <TouchableOpacity
              key={year}
              style={[styles.yearButton, selectedYear === year && styles.yearButtonActive]}
              onPress={() => setSelectedYear(year)}
            >
              <Text style={[styles.yearButtonText, selectedYear === year && styles.yearButtonTextActive]}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${totalPayments.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Payments</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{contractorsCount}</Text>
          <Text style={styles.statLabel}>Contractors Paid</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{contractors1099Count}</Text>
          <Text style={styles.statLabel}>1099s Required</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1099-NEC Forms</Text>
        <Text style={styles.sectionDescription}>
          Generate 1099-NEC forms for contractors who received $600 or more in {selectedYear}
        </Text>
        
        <TouchableOpacity
          style={[styles.generateButton, generate1099Mutation.isPending && styles.generateButtonDisabled]}
          onPress={handleGenerate1099s}
          disabled={generate1099Mutation.isPending}
        >
          <Text style={styles.generateButtonText}>
            {generate1099Mutation.isPending ? 'Generating...' : `Generate ${selectedYear} 1099 Forms`}
          </Text>
        </TouchableOpacity>

        {form1099Query.data && form1099Query.data.length > 0 && (
          <View style={styles.form1099List}>
            <Text style={styles.listTitle}>Generated 1099 Forms:</Text>
            {form1099Query.data.map((form) => (
              <View key={form.id} style={styles.form1099Item}>
                <View style={styles.form1099Info}>
                  <Text style={styles.form1099Amount}>${form.totalPayments.toLocaleString()}</Text>
                  <Text style={styles.form1099Status}>Status: {form.status}</Text>
                </View>
                <View style={styles.form1099Actions}>
                  <Text style={styles.form1099Date}>
                    {form.generatedAt ? new Date(form.generatedAt).toLocaleDateString() : 'Draft'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Records</Text>
        <Text style={styles.sectionDescription}>
          All contractor payments for {selectedYear}
        </Text>
        
        {paymentsQuery.data && paymentsQuery.data.length > 0 ? (
          <View style={styles.paymentsList}>
            {paymentsQuery.data.map((payment) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentAmount}>${payment.amount.toLocaleString()}</Text>
                  <Text style={styles.paymentDescription}>{payment.description}</Text>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </Text>
                </View>
                {payment.isSubjectToBackupWithholding && (
                  <View style={styles.backupWithholdingBadge}>
                    <Text style={styles.backupWithholdingText}>Backup Withholding</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>No payments recorded for {selectedYear}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tax Compliance Checklist</Text>
        <View style={styles.checklist}>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>✓ Collect W-9 forms from all contractors</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>✓ Track all contractor payments throughout the year</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>✓ Generate 1099-NEC forms by January 31st</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>✓ File 1099s with IRS by February 28th (March 31st if filing electronically)</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistText}>✓ Provide copies to contractors by January 31st</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  yearSelector: {
    marginBottom: 30,
  },
  yearLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  yearButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  yearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  yearButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  yearButtonText: {
    fontSize: 16,
    color: '#333',
  },
  yearButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  generateButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  form1099List: {
    marginTop: 10,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  form1099Item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  form1099Info: {
    flex: 1,
  },
  form1099Amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  form1099Status: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  form1099Actions: {
    alignItems: 'flex-end',
  },
  form1099Date: {
    fontSize: 14,
    color: '#666',
  },
  paymentsList: {
    marginTop: 10,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  paymentDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  backupWithholdingBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  backupWithholdingText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
  checklist: {
    marginTop: 10,
  },
  checklistItem: {
    marginBottom: 10,
  },
  checklistText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
});