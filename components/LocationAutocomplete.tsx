import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { trpcClient } from '@/lib/trpc';

interface LocationAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (payload: { description: string; placeId?: string; lat?: number; lng?: number; address?: string }) => void;
  placeholder?: string;
  testID?: string;
}

export default function LocationAutocomplete({ value, onChangeText, onSelect, placeholder = 'Search address', testID }: LocationAutocompleteProps) {
  const [query, setQuery] = useState<string>(value);
  const [predictions, setPredictions] = useState<Array<{ description: string; place_id: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionToken = useMemo(() => Math.random().toString(36).slice(2) + Date.now().toString(36), []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchPredictions = useCallback(async (q: string) => {
    if (!q || q.trim().length < 3) {
      setPredictions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await trpcClient.maps.autocomplete.query({ query: q.trim(), sessionToken });
      setPredictions(res.predictions.map(p => ({ description: p.description, place_id: p.place_id })));
      setOpen(true);
    } catch (e) {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  const onChange = useCallback((text: string) => {
    onChangeText(text);
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPredictions(text).catch(() => {});
    }, 250);
  }, [fetchPredictions, onChangeText]);

  const handleSelect = useCallback(async (item: { description: string; place_id: string }) => {
    setOpen(false);
    onChangeText(item.description);
    setQuery(item.description);
    setPredictions([]);
    try {
      const geo = await trpcClient.maps.geocode.query({ placeId: item.place_id });
      const best = geo.results[0];
      if (best) {
        onSelect({ description: best.formatted_address, placeId: best.place_id, lat: best.geometry.location.lat, lng: best.geometry.location.lng, address: best.formatted_address });
        return;
      }
    } catch {}
    onSelect({ description: item.description, placeId: item.place_id });
  }, [onChangeText, onSelect]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputContainer}>
        <MapPin size={18} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          testID={testID ?? 'location-autocomplete'}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={onChange}
          onFocus={() => { if (predictions.length > 0) setOpen(true); }}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {!!query && (
          <TouchableOpacity accessibilityRole="button" onPress={() => { onChange(''); setOpen(false); }} style={styles.clearBtn}>
            <X size={16} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.dropdownContainer, open ? styles.dropdownOpen : undefined]}>
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#10B981" />
            <Text style={styles.loadingText}>Searching…</Text>
          </View>
        )}
        {!loading && open && predictions.length > 0 && (
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={predictions}
            keyExtractor={(it) => it.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity testID={`prediction-${item.place_id}`} style={styles.itemRow} onPress={() => handleSelect(item)}>
                <MapPin size={16} color="#10B981" />
                <Text numberOfLines={2} style={styles.itemText}>{item.description}</Text>
              </TouchableOpacity>
            )}
            style={styles.list}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative' as const,
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginTop: 14,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  clearBtn: {
    paddingVertical: 12,
    paddingLeft: 8,
  },
  dropdownContainer: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 3 : 0,
    display: 'none',
  },
  dropdownOpen: {
    display: 'flex',
  },
  loadingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  list: {
    maxHeight: 220,
  },
  itemRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemText: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
  },
});
