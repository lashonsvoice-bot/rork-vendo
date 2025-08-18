import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LocalVendorCategory = 'mlm' | 'crafter' | 'other';

export interface LocalVendorProfile {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  productDescription: string;
  link?: string;
  logoUrl?: string;
  yearsInBusiness?: string;
  category: LocalVendorCategory;
  categoryOther?: string;
  createdAt: string;
}

export interface FavoriteListing {
  id: string;
  eventId: string;
  tableId?: string;
  savedAt: string;
}

export interface ReminderItem {
  id: string;
  eventId: string;
  remindAtISO: string;
  note?: string;
  createdAt: string;
}

const FAVORITES_KEY = 'lv_favorites';
const REMINDERS_KEY = 'lv_reminders';
const PROFILE_KEY = 'lv_profile';

export const [LocalVendorProvider, useLocalVendor] = createContextHook(() => {
  const [favorites, setFavorites] = useState<FavoriteListing[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [profile, setProfile] = useState<LocalVendorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    try {
      const [favRaw, remRaw, profRaw] = await Promise.all([
        AsyncStorage.getItem(FAVORITES_KEY),
        AsyncStorage.getItem(REMINDERS_KEY),
        AsyncStorage.getItem(PROFILE_KEY),
      ]);
      if (favRaw) setFavorites(JSON.parse(favRaw));
      if (remRaw) setReminders(JSON.parse(remRaw));
      if (profRaw) setProfile(JSON.parse(profRaw));
    } catch (e) {
      console.log('[LocalVendor] load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveFavorites = useCallback(async (next: FavoriteListing[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch (e) {
      console.log('[LocalVendor] saveFavorites error', e);
    }
  }, []);

  const saveReminders = useCallback(async (next: ReminderItem[]) => {
    try {
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(next));
    } catch (e) {
      console.log('[LocalVendor] saveReminders error', e);
    }
  }, []);

  const saveProfile = useCallback(async (next: LocalVendorProfile) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      setProfile(next);
    } catch (e) {
      console.log('[LocalVendor] saveProfile error', e);
    }
  }, []);

  const toggleFavorite = useCallback((eventId: string, tableId?: string) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.eventId === eventId && (tableId ? f.tableId === tableId : true));
      if (exists) {
        const next = prev.filter(f => f.id !== exists.id);
        saveFavorites(next);
        return next;
      }
      const newFav: FavoriteListing = {
        id: `fav-${eventId}-${tableId ?? 'all'}-${Date.now()}`,
        eventId,
        tableId,
        savedAt: new Date().toISOString(),
      };
      const next = [newFav, ...prev];
      saveFavorites(next);
      return next;
    });
  }, [saveFavorites]);

  const isFavorite = useCallback((eventId: string, tableId?: string) => {
    return favorites.some(f => f.eventId === eventId && (tableId ? f.tableId === tableId : true));
  }, [favorites]);

  const addReminder = useCallback((eventId: string, remindAtISO: string, note?: string) => {
    const newItem: ReminderItem = {
      id: `rem-${eventId}-${Date.now()}`,
      eventId,
      remindAtISO,
      note,
      createdAt: new Date().toISOString(),
    };
    const next = [newItem, ...reminders];
    setReminders(next);
    saveReminders(next);
    return newItem;
  }, [reminders, saveReminders]);

  const removeReminder = useCallback((id: string) => {
    const next = reminders.filter(r => r.id !== id);
    setReminders(next);
    saveReminders(next);
  }, [reminders, saveReminders]);

  const upcomingReminders = useMemo(() => {
    const now = Date.now();
    return reminders
      .filter(r => new Date(r.remindAtISO).getTime() >= now)
      .sort((a, b) => new Date(a.remindAtISO).getTime() - new Date(b.remindAtISO).getTime());
  }, [reminders]);

  const isProfileComplete = useCallback(() => {
    if (!profile) return false;
    const ok = Boolean(
      (profile.name || '').trim() &&
      (profile.businessName || '').trim() &&
      (profile.email || '').trim() &&
      (profile.phone || '').trim() &&
      (profile.productDescription || '').trim() &&
      (profile.category || 'other') &&
      (profile.category !== 'other' || (profile.categoryOther || '').trim() !== '')
    );
    return ok;
  }, [profile]);

  return {
    loading,
    favorites,
    reminders,
    profile,
    toggleFavorite,
    isFavorite,
    addReminder,
    removeReminder,
    upcomingReminders,
    saveProfile,
    isProfileComplete,
  } as const;
});
