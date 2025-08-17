import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Clock, ChevronDown, X } from 'lucide-react-native';

export type TimePickerFieldProps = {
  label?: string;
  value?: string | null;
  onChange: (time: string) => void;
  placeholder?: string;
  testID?: string;
  required?: boolean;
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function parseTime(value?: string | null) {
  if (!value) return null as const;
  const m = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null as const;
  const h = Math.max(1, Math.min(12, parseInt(m[1], 10)));
  const min = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  const ap = m[3].toUpperCase() as 'AM' | 'PM';
  return { hour: h, minute: min, ap } as const;
}

export default function TimePickerField({ label, value, onChange, placeholder = 'HH:MM AM/PM', testID, required }: TimePickerFieldProps) {
  const [open, setOpen] = useState<boolean>(false);
  const parsed = parseTime(value ?? null);
  const [temp, setTemp] = useState<{ hour: number; minute: number; ap: 'AM' | 'PM' } | null>(parsed);

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => (i + 1)), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const ampm = ['AM', 'PM'] as const;

  const hourSel = temp?.hour ?? parsed?.hour ?? 12;
  const minSel = temp?.minute ?? parsed?.minute ?? 0;
  const apSel = temp?.ap ?? parsed?.ap ?? 'AM';

  return (
    <View style={styles.root}>
      {label && (
        <Text style={styles.label} testID={testID ? `${testID}-label` : undefined}>
          {label}{required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        testID={testID}
        style={styles.input}
        onPress={() => {
          setTemp(parsed ?? { hour: 12, minute: 0, ap: 'AM' });
          setOpen(true);
        }}
      >
        <Clock size={18} color="#9CA3AF" />
        <Text style={[styles.valueText, !value && styles.placeholder]}>
          {value ?? placeholder}
        </Text>
        <ChevronDown size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select time</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.iconBtn}>
                <X size={18} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerRow}>
              <ScrollView style={styles.column} contentContainerStyle={styles.colContent}>
                {hours.map(h => (
                  <TouchableOpacity key={`h-${h}`} style={[styles.option, hourSel === h && styles.optionSelected]} onPress={() => setTemp(prev => ({ hour: h, minute: prev?.minute ?? minSel, ap: prev?.ap ?? apSel }))}>
                    <Text style={[styles.optionText, hourSel === h && styles.optionTextSelected]}>{pad(h)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView style={styles.column} contentContainerStyle={styles.colContent}>
                {minutes.map(m => (
                  <TouchableOpacity key={`m-${m}`} style={[styles.option, minSel === m && styles.optionSelected]} onPress={() => setTemp(prev => ({ hour: prev?.hour ?? hourSel, minute: m, ap: prev?.ap ?? apSel }))}>
                    <Text style={[styles.optionText, minSel === m && styles.optionTextSelected]}>{pad(m)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView style={styles.column} contentContainerStyle={styles.colContent}>
                {ampm.map(ap => (
                  <TouchableOpacity key={`ap-${ap}`} style={[styles.option, apSel === ap && styles.optionSelected]} onPress={() => setTemp(prev => ({ hour: prev?.hour ?? hourSel, minute: prev?.minute ?? minSel, ap }))}>
                    <Text style={[styles.optionText, apSel === ap && styles.optionTextSelected]}>{ap}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              testID={testID ? `${testID}-apply` : undefined}
              style={styles.applyBtn}
              onPress={() => {
                const h = temp?.hour ?? hourSel;
                const m = temp?.minute ?? minSel;
                const ap = temp?.ap ?? apSel;
                const display = `${pad(h)}:${pad(m)} ${ap}`;
                onChange(display);
                setOpen(false);
              }}
            >
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  required: { color: '#EF4444' },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    gap: 8,
  },
  valueText: { flex: 1, fontSize: 15, color: '#111827' },
  placeholder: { color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  iconBtn: { padding: 6 },
  pickerRow: { flexDirection: 'row', padding: 12, gap: 12, minHeight: 240 },
  column: { flex: 1 },
  colContent: { paddingVertical: 4 },
  option: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  optionSelected: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74' },
  optionText: { fontSize: 14, color: '#374151' },
  optionTextSelected: { color: '#EA580C', fontWeight: '700' },
  applyBtn: { backgroundColor: '#111827', alignItems: 'center', paddingVertical: 12 },
  applyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});