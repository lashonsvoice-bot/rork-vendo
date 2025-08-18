import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { AppTheme, lightTheme, darkTheme, revoVendTheme } from '@/constants/theme';

type ThemeMode = 'light' | 'dark' | 'neon' | 'system';

interface ThemeContextType {
  theme: AppTheme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'app_theme_mode';

export const [ThemeProvider, useTheme] = createContextHook<ThemeContextType>(() => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['light', 'dark', 'neon', 'system'].includes(savedTheme)) {
          setThemeModeState(savedTheme as ThemeMode);
        } else {
          // Default to neon theme for RevoVend
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'neon');
          setThemeModeState('neon');
        }
      } catch (error) {
        console.log('[Theme] Failed to load theme preference:', error);
      }
    };

    loadThemePreference();
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      console.log('[Theme] System color scheme changed:', colorScheme);
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'dark' || themeMode === 'neon') return true;
    if (themeMode === 'light') return false;
    return systemColorScheme === 'dark';
  }, [themeMode, systemColorScheme]);

  const theme = useMemo<AppTheme>(() => {
    if (themeMode === 'neon') return revoVendTheme;
    if (themeMode === 'dark') return darkTheme;
    if (themeMode === 'light') return lightTheme;
    // System mode
    return systemColorScheme === 'dark' ? revoVendTheme : lightTheme;
  }, [themeMode, systemColorScheme]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      console.log('[Theme] Setting theme mode to', mode);
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.log('[Theme] Failed to save theme preference:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const modes: ThemeMode[] = ['neon', 'light', 'dark'];
    const currentIndex = modes.indexOf(themeMode === 'system' ? (systemColorScheme === 'dark' ? 'neon' : 'light') : themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];
    console.log('[Theme] Toggling theme. New mode:', newMode);
    setThemeMode(newMode);
  }, [themeMode, systemColorScheme, setThemeMode]);

  return useMemo(() => ({
    theme,
    themeMode,
    isDark,
    setThemeMode,
    toggleTheme,
  }), [theme, themeMode, isDark, setThemeMode, toggleTheme]);
});