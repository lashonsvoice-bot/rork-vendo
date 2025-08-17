import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SPLASH_SHOWN_KEY = 'splash_screen_shown';

export const [SplashProvider, useSplash] = createContextHook(() => {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkSplashStatus();
  }, []);

  const checkSplashStatus = async () => {
    try {
      const hasShownSplash = await AsyncStorage.getItem(SPLASH_SHOWN_KEY);
      
      // Show splash on first launch or if user wants to see it again
      if (!hasShownSplash) {
        setShowSplash(true);
      } else {
        setShowSplash(false);
      }
    } catch (error) {
      console.log('Error checking splash status:', error);
      setShowSplash(true); // Default to showing splash on error
    } finally {
      setIsLoading(false);
    }
  };

  const hideSplash = useCallback(async () => {
    try {
      await AsyncStorage.setItem(SPLASH_SHOWN_KEY, 'true');
      setShowSplash(false);
    } catch (error) {
      console.log('Error saving splash status:', error);
      setShowSplash(false); // Hide anyway
    }
  }, []);

  const resetSplash = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(SPLASH_SHOWN_KEY);
      setShowSplash(true);
    } catch (error) {
      console.log('Error resetting splash status:', error);
    }
  }, []);

  return useMemo(() => ({
    showSplash,
    isLoading,
    hideSplash,
    resetSplash,
  }), [showSplash, isLoading, hideSplash, resetSplash]);
});