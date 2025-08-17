import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Calendar, ChevronDown, X } from 'lucide-react-native';

export type DatePickerFieldProps = {
  label?: string;
  valueISO?: string | null;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  testID?: string;
  minimumYear?: number;
  maximumYear?: number;
  required?: boolean;
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function toISO(year: number, monthIndex: number, day: number) {
  const mm = pad(monthIndex + 1);
  const dd = pad(day);
  return `${year}-${mm}-${dd}`;
}

function parseISO(iso?: string | null) {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const monthIndex = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  return { year, monthIndex, day } as const;
}

export function formatMMDDYYYY(iso?: string | null) {
  const p = parseISO(iso || null);
  if (!p) return '';
  const pad2 = (v: number) => (v < 10 ? `0${v}` : `${v}`);
  return `${pad2(p.monthIndex + 1)}/${pad2(p.day)}/${p.year}`;
}

export default function DatePickerField({ label, valueISO, onChange, placeholder = 'MM/DD/YYYY', testID, minimumYear = 1940, maximumYear = new Date().getFullYear() + 5, required }: DatePickerFieldProps) {
  const parsed = parseISO(valueISO ?? null);
  const [open, setOpen] = useState<boolean>(false);
  const [temp, setTemp] = useState<{ year: number; monthIndex: number; day: number } | null>(parsed);

  const months = useMemo(() => [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ], []);

  const years = useMemo(() => {
    const ys: number[] = [];
    for (let y = maximumYear; y >= minimumYear; y--) ys.push(y);
    return ys;
  }, [maximumYear, minimumYear]);

  const daysInMonth = useMemo(() => {
    const y = temp?.year ?? parsed?.year ?? new Date().getFullYear();
    const m = temp?.monthIndex ?? parsed?.monthIndex ?? new Date().getMonth();
    return new Date(y, m + 1, 0).getDate();
  }, [temp?.year, temp?.monthIndex, parsed?.year, parsed?.monthIndex]);

  const selectedDay = Math.min((temp?.day ?? parsed?.day ?? 1), daysInMonth);

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
          setTemp(parsed ?? { year: new Date().getFullYear(), monthIndex: new Date().getMonth(), day: new Date().getDate() });
          setOpen(true);
        }}
      >
        <Calendar size={18} color="#9CA3AF" />
        <Text style={[styles.valueText, !valueISO && styles.placeholder]}>
          {valueISO ? formatMMDDYYYY(valueISO) : placeholder}
        </Text>
        <ChevronDown size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select date</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.iconBtn}>
                <X size={18} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerRow}>
              <ScrollView style={styles.column} contentContainerStyle={styles.colContent}>
                {months.map((m, i) => (
                  <TouchableOpacity key={m} style={[styles.option, (temp?.monthIndex ?? parsed?.monthIndex) === i && styles.optionSelected]} onPress={() => setTemp(prev => ({ year: prev?.year ?? parsed?.year ?? new Date().getFullYear(), monthIndex: i, day: prev?.day ?? parsed?.day ?? new Date().getDate() }))}>
                    <Text style={[styles.optionText, (temp?.monthIndex ?? parsed?.monthIndex) === i && styles.optionTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView style={styles.column} contentContainerStyle={styles.colContent}>
                {Array.from({ length: daysInMonth }, (_, idx) => idx + 1).map(d => (
                  <TouchableOpacity key={`d-${d}`} style={[styles.option, selectedDay === d && styles.optionSelected]} onPress={() => setTemp(prev => ({ year: prev?.year ?? parsed?.year ?? new Date().getFullYear(), monthIndex: prev?.monthIndex ?? parsed?.monthIndex ?? new Date().getMonth(), day: d }))}>
                    <Text style={[styles.optionText, selectedDay === d && styles.optionTextSelected]}>{d < 10 ? `0${d}` : d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView style={styles.column} contentContainerStyle={styles.colContent}>
                {years.map(y => (
                  <TouchableOpacity key={`y-${y}`} style={[styles.option, (temp?.year ?? parsed?.year) === y && styles.optionSelected]} onPress={() => setTemp(prev => ({ year: y, monthIndex: prev?.monthIndex ?? parsed?.monthIndex ?? new Date().getMonth(), day: prev?.day ?? parsed?.day ?? new Date().getDate() }))}>
                    <Text style={[styles.optionText, (temp?.year ?? parsed?.year) === y && styles.optionTextSelected]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              testID={testID ? `${testID}-apply` : undefined}
              style={styles.applyBtn}
              onPress={() => {
                const y = temp?.year ?? parsed?.year ?? new Date().getFullYear();
                const m = temp?.monthIndex ?? parsed?.monthIndex ?? new Date().getMonth();
                const d = temp?.day ?? parsed?.day ?? new Date().getDate();
                const iso = toISO(y, m, d);
                onChange(iso);
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
  optionSelected: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#10B981' },
  optionText: { fontSize: 14, color: '#374151' },
  optionTextSelected: { color: '#10B981', fontWeight: '700' },
  applyBtn: { backgroundColor: '#111827', alignItems: 'center', paddingVertical: 12 },
  applyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});