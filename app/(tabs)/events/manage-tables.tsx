import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, Bell, Calendar, DollarSign, Clock, MapPin, Star, Save } from 'lucide-react-native';
import { useEvents } from '@/hooks/events-store';
import { useLocalVendor } from '@/hooks/local-vendor-store';

export default function ManageTablesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const { events } = useEvents();
  const { favorites, reminders, toggleFavorite, isFavorite, addReminder, removeReminder, upcomingReminders, profile, isProfileComplete } = useLocalVendor();

  const [note, setNote] = useState<string>('');
  const [remindAt, setRemindAt] = useState<string>('');

  const event = useMemo(() => {
    const id = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
    if (!id) return undefined;
    return events.find(e => e.id === id);
  }, [params.eventId, events]);

  return (
    <>
      <Stack.Screen options={{ title: 'Manage Tables' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {event ? (
          <>
            <View style={styles.headerCard}>
              <Text style={styles.title}>{event.title}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <MapPin size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{event.city}, {event.state}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Calendar size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{new Date(event.date).toLocaleDateString()}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={14} color="#6B7280" />
                  <Text style={styles.metaText}>{event.time}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Favorites</Text>
              <View style={styles.card}>
                {event.tableOptions?.map(table => (
                  <View key={table.id} style={styles.row}>
                    <Text style={styles.rowTitle}>{table.size}</Text>
                    <View style={styles.rowRight}>
                      <Text style={styles.price}>${table.price}</Text>
                      <TouchableOpacity
                        testID={`fav-${table.id}`}
                        style={[styles.iconButton, isFavorite(event.id, table.id) && styles.iconButtonActive]}
                        onPress={() => toggleFavorite(event.id, table.id)}
                        accessibilityRole="button"
                      >
                        <Heart size={18} color={isFavorite(event.id, table.id) ? '#EF4444' : '#6B7280'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {(!event.tableOptions || event.tableOptions.length === 0) && (
                  <Text style={styles.emptyText}>No table options posted by host yet.</Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reminders</Text>
              <View style={styles.card}>
                <View style={styles.inputRow}>
                  <TextInput
                    testID="remindAtInput"
                    style={styles.input}
                    placeholder="YYYY-MM-DDTHH:mm"
                    value={remindAt}
                    onChangeText={setRemindAt}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    testID="noteInput"
                    style={styles.input}
                    placeholder="Note (optional)"
                    value={note}
                    onChangeText={setNote}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <TouchableOpacity
                  testID="addReminder"
                  style={styles.primaryButton}
                  onPress={() => {
                    if (!remindAt) {
                      Alert.alert('Missing date', 'Please enter a date/time in ISO format, e.g. 2025-09-01T09:00');
                      return;
                    }
                    if (!event) return;
                    addReminder(event.id, remindAt, note);
                    setRemindAt('');
                    setNote('');
                  }}
                >
                  <Text style={styles.primaryButtonText}>Add Reminder</Text>
                </TouchableOpacity>

                {upcomingReminders.filter(r => r.eventId === event.id).map(r => (
                  <View key={r.id} style={styles.reminderItem}>
                    <View style={styles.metaItem}>
                      <Bell size={14} color="#6B7280" />
                      <Text style={styles.metaText}>{new Date(r.remindAtISO).toLocaleString()}</Text>
                    </View>
                    {r.note ? <Text style={styles.reminderNote}>{r.note}</Text> : null}
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => removeReminder(r.id)}>
                      <Text style={styles.secondaryButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Checkout</Text>
              <View style={styles.card}>
                {profile && !isProfileComplete() && (
                  <View style={styles.warning}>
                    <Star size={14} color="#92400E" />
                    <Text style={styles.warningText}>Complete your profile before purchasing a table.</Text>
                  </View>
                )}
                <TouchableOpacity
                  testID="goToProfile"
                  style={styles.secondaryButton}
                  onPress={() => router.push('/profile-edit')}
                >
                  <Text style={styles.secondaryButtonText}>Edit Profile</Text>
                </TouchableOpacity>

                <View style={styles.divider} />
                <Text style={styles.caption}>Select a favorited table above, then proceed to payment on the event screen.</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Open an event first to manage tables.</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  headerCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#6B7280', fontSize: 12 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { color: '#10B981', fontWeight: '700' },
  iconButton: { padding: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  iconButtonActive: { backgroundColor: '#FEE2E2' },
  inputRow: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 10 : 8, marginBottom: 8 },
  input: { color: '#111827', fontSize: 14 },
  primaryButton: { backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: { backgroundColor: '#F3F4F6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  secondaryButtonText: { color: '#374151', fontWeight: '600' },
  reminderItem: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginTop: 8 },
  reminderNote: { color: '#374151', marginTop: 4 },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FCD34D' },
  warningText: { color: '#92400E', flex: 1, fontSize: 12 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  caption: { color: '#6B7280', fontSize: 12 },
  emptyWrap: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#6B7280' },
});
