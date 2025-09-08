import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { neonTheme } from '@/constants/theme';
import { SkipForward } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface ImageSplashScreenProps {
  onFinish: () => void;
  imageUri?: string;
  duration?: number;
}

export function VideoSplashScreen({ 
  onFinish, 
  imageUri = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/pbjd99blhw93wmj7xgp9m',
  duration = 5000 
}: ImageSplashScreenProps) {
  const [showSkip, setShowSkip] = useState<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Show skip button after 2 seconds
    const skipTimeout = setTimeout(() => {
      setShowSkip(true);
    }, 2000);

    // Auto finish after duration
    timeoutRef.current = setTimeout(() => {
      onFinish();
    }, duration);

    return () => {
      clearTimeout(skipTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [duration, onFinish]);

  const handleSkip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onFinish();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={[neonTheme.background, neonTheme.accentCyan, neonTheme.accentPink]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Image container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.splashImage}
          resizeMode="contain"
          onError={(error) => {
            console.log('Image error:', error);
          }}
        />

        {/* Overlay gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Controls overlay */}
      <View style={styles.controlsOverlay}>
        {/* Skip button */}
        {showSkip && (
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
            testID="image-skip-button"
          >
            <SkipForward size={20} color={neonTheme.textPrimary} />
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom branding */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.brandText}>RevoVend</Text>
        <Text style={styles.subtitleText}>Vend Remotely world wide. Sell out events locally.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neonTheme.background,
  },
  imageContainer: {
    flex: 1,
    width: width,
    height: height,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: width * 0.8,
    height: width * 0.8,
    maxWidth: 400,
    maxHeight: 400,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neonTheme.textPrimary,
  },
  skipText: {
    color: neonTheme.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  brandText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: neonTheme.textPrimary,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: neonTheme.textPrimary,
    opacity: 0.8,
    textAlign: 'center',
  },
});