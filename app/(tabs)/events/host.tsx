import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEvents, Event, VendorCheckIn } from '@/hooks/events-store';
import { useUser } from '@/hooks/user-store';
import { Calendar, Clock, MapPin, ChevronRight, CheckCircle2, AlertCircle, DollarSign, Package, ShieldCheck, Users, PlusCircle, BadgeCheck } from 'lucide-react-native';

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} testID={`section-${title}`}>{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.sectionAction} testID={`action-${title}`}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function EventCard({ evt, onOpen }: { evt: Event; onOpen: () => void }) {
  const vendors = evt.vendors ?? [];
  const checkedIn = vendors.filter(v => v.arrivalConfirmed).length;
  const halfway = vendors.filter(v => v.halfwayConfirmed).length;
  const completed = vendors.filter(v => v.endConfirmed).length;

  return (
    <TouchableOpacity onPress={onOpen} style={styles.card} testID={`event-${evt.id}`}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{evt.title}</Text>
        <ChevronRight size={18} color="#9CA3AF" />
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.metaText} numberOfLines={1}>{evt.location}</Text>
        </View>
        <View style={styles.metaItem}>
          <Calendar size={14} color="#6B7280" />
          <Text style={styles.metaText}>{evt.date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.metaText}>{evt.time}</Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <View style={styles.badge}>
          <Users size={14} color="#2563EB" />
          <Text style={styles.badgeText}>{vendors.length} vendors</Text>
        </View>
        <View style={styles.badgeMuted}>
          <BadgeCheck size={14} color="#10B981" />
          <Text style={styles.badgeMutedText}>{checkedIn} in</Text>
        </View>
        <View style={styles.badgeMuted}>
          <Package size={14} color="#F59E0B" />
          <Text style={styles.badgeMutedText}>{halfway} halfway</Text>
        </View>
        <View style={styles.badgeMuted}>
          <CheckCircle2 size={14} color="#6B7280" />
          <Text style={styles.badgeMutedText}>{completed} done</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HostDashboard() {
  const router = useRouter();
  const { events, updateEvent, updateVendorCheckIn } = useEvents();
  const { currentUser, userRole } = useUser();

  const [paymentConf, setPaymentConf] = useState<string>('');
  const [materialsNotes, setMaterialsNotes] = useState<string>('');

  const { upcoming, active, past } = useMemo(() => {
    const today = new Date();
    const bucket = { upcoming: [] as Event[], active: [] as Event[], past: [] as Event[] };
    events.forEach(e => {
      const d = new Date(e.date);
      if (e.status === 'completed' || d < today) bucket.past.push(e);
      else if (e.status === 'active' || e.status === 'ready_for_event' || e.status === 'contractors_hired') bucket.active.push(e);
      else bucket.upcoming.push(e);
    });
    const sort = (arr: Event[]) => [...arr].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { upcoming: sort(bucket.upcoming), active: sort(bucket.active), past: sort(bucket.past) };
  }, [events]);

  const goToManage = useCallback((id: string) => {
    router.push(`/events/manage/${id}` as const);
  }, [router]);

  const markPaymentReceived = useCallback((evt: Event) => {
    if (!paymentConf.trim()) {
      Alert.alert('Confirmation required', 'Enter a confirmation number.');
      return;
    }
    updateEvent(evt.id, { paymentReceived: true, paymentReceivedDate: new Date().toISOString(), paymentConfirmationNumber: paymentConf });
    setPaymentConf('');
    Alert.alert('Saved', 'Marked payment received.');
  }, [paymentConf, updateEvent]);

  const markMaterialsReceived = useCallback((evt: Event) => {
    updateEvent(evt.id, { materialsReceived: true, materialsReceivedDate: new Date().toISOString(), materialsDescription: materialsNotes });
    setMaterialsNotes('');
    Alert.alert('Saved', 'Marked materials/deliverables received.');
  }, [materialsNotes, updateEvent]);

  const toggleInventory = useCallback((evt: Event) => {
    updateEvent(evt.id, { inventoryChecked: !(evt.inventoryChecked ?? false) });
  }, [updateEvent]);

  const halfwayRelease = useCallback((evt: Event, vendor: VendorCheckIn) => {
    if (evt.stipendReleaseMethod === 'prepaid_cards') {
      Alert.alert('Prepaid Cards', 'Record that a prepaid card was handed to contractor.');
      updateVendorCheckIn(evt.id, vendor.id, { stipendReleased: true, halfwayConfirmed: true, halfwayCheckIn: new Date().toLocaleTimeString() });
      return;
    }
    if (evt.stipendReleaseMethod === 'escrow') {
      Alert.alert('Escrow', 'An escrow release request has been sent to the business owner.');
      updateVendorCheckIn(evt.id, vendor.id, { stipendReleased: true, halfwayConfirmed: true, halfwayCheckIn: new Date().toLocaleTimeString() });
      return;
    }
    Alert.alert('Notify Owner', 'We sent a notification to the business owner to release the halfway stipend.');
    updateVendorCheckIn(evt.id, vendor.id, { halfwayConfirmed: true, halfwayCheckIn: new Date().toLocaleTimeString() });
  }, [updateVendorCheckIn]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle} testID="host-dashboard-title">Host Event Manager</Text>

      <SectionHeader title="Upcoming" />
      {upcoming.length === 0 ? (
        <View style={styles.emptyState}>
          <AlertCircle size={28} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>No upcoming events yet.</Text>
        </View>
      ) : (
        upcoming.map(evt => (
          <View key={evt.id} style={styles.block}>
            <EventCard evt={evt} onOpen={() => goToManage(evt.id)} />
            <View style={styles.formRow}>
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Payment confirmation</Text>
                <TextInput
                  value={paymentConf}
                  onChangeText={setPaymentConf}
                  placeholder="ABC-12345"
                  style={styles.input}
                  testID={`pay-conf-${evt.id}`}
                />
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => markPaymentReceived(evt)} testID={`mark-paid-${evt.id}`}>
                <DollarSign size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>Mark Paid</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formRow}>
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Deliverables / tracking</Text>
                <TextInput
                  value={materialsNotes}
                  onChangeText={setMaterialsNotes}
                  placeholder="Boxes, signage, tracking #, etc."
                  style={styles.input}
                  testID={`materials-notes-${evt.id}`}
                />
              </View>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => markMaterialsReceived(evt)} testID={`mark-materials-${evt.id}`}>
                <Package size={16} color="#111827" />
                <Text style={styles.secondaryBtnText}>Mark Received</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleInventory(evt)} testID={`inventory-${evt.id}`}>
              <ShieldCheck size={16} color={evt.inventoryChecked ? '#10B981' : '#9CA3AF'} />
              <Text style={styles.checkboxText}>Inventory checked and logged</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <SectionHeader title="Active" />
      {active.length === 0 ? (
        <View style={styles.emptyState}>
          <AlertCircle size={28} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>No active events.</Text>
        </View>
      ) : (
        active.map(evt => (
          <View key={evt.id} style={styles.block}>
            <EventCard evt={evt} onOpen={() => goToManage(evt.id)} />

            {(evt.vendors ?? []).map(v => (
              <View key={v.id} style={styles.vendorRow}>
                <View style={styles.vendorCol}>
                  <Text style={styles.vendorName}>{v.vendorName}</Text>
                  <Text style={styles.vendorSub}>Table {v.tableLabel ?? '—'}</Text>
                </View>
                <TouchableOpacity style={styles.linkBtn} onPress={() => goToManage(evt.id)}>
                  <Text style={styles.linkBtnText}>Manage</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.midBtn} onPress={() => halfwayRelease(evt, v)} testID={`halfway-${evt.id}-${v.id}`}>
                  <DollarSign size={14} color="#fff" />
                  <Text style={styles.midBtnText}>{v.stipendReleased ? 'Stipend Sent' : 'Halfway Release'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))
      )}

      <SectionHeader title="Past" />
      {past.length === 0 ? (
        <View style={styles.emptyState}>
          <AlertCircle size={28} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>No past events yet.</Text>
        </View>
      ) : (
        past.map(evt => (
          <EventCard key={evt.id} evt={evt} onOpen={() => goToManage(evt.id)} />
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: '#E5E7EB', marginBottom: 12 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  sectionAction: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#111827', borderRadius: 8 },
  sectionActionText: { color: '#9CA3AF', fontWeight: '600' },

  card: { backgroundColor: '#111827', borderRadius: 16, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#E5E7EB' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' as const },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#9CA3AF', fontSize: 12, maxWidth: 220 },
  progressRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' as const },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#1E3A8A', fontSize: 12, fontWeight: '700' },
  badgeMuted: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1F2937', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeMutedText: { color: '#E5E7EB', fontSize: 12, fontWeight: '600' },

  block: { backgroundColor: '#0B1220', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#111827' },
  formRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 8 },
  inputWrap: { flex: 1 },
  label: { color: '#9CA3AF', fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#1F2937', backgroundColor: '#0B1220', color: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  primaryBtn: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  secondaryBtnText: { color: '#111827', fontWeight: '700' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  checkboxText: { color: '#E5E7EB' },

  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0B1220', borderRadius: 12, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#111827' },
  vendorCol: { flex: 1 },
  vendorName: { color: '#F8FAFC', fontWeight: '700' },
  vendorSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  linkBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#111827' },
  linkBtnText: { color: '#93C5FD', fontWeight: '700' },
  midBtn: { backgroundColor: '#2563EB', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  midBtnText: { color: '#fff', fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 20 },
  emptyStateText: { color: '#9CA3AF', marginTop: 6 },
});
