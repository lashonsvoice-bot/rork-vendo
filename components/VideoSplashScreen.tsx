import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform, Text, TouchableOpacity } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { neonTheme } from '@/constants/theme';
import { Play, SkipForward } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface VideoSplashScreenProps {
  onFinish: () => void;
  videoUri?: string;
  duration?: number;
}

export function VideoSplashScreen({ 
  onFinish, 
  videoUri = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  duration = 5000 
}: VideoSplashScreenProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);
  const [showSkip, setShowSkip] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<Video>(null);
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

  const handleVideoLoad = (status: AVPlaybackStatus) => {
    if (status.isLoaded && !isVideoLoaded) {
      setIsVideoLoaded(true);
      setIsPlaying(true);
    }
  };

  const handleSkip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onFinish();
  };

  const handlePlayPress = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    }
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

      {/* Video container */}
      <View style={styles.videoContainer}>
        {Platform.OS !== 'web' ? (
          <Video
            ref={videoRef}
            style={styles.video}
            source={{ uri: videoUri }}
            resizeMode={ResizeMode.COVER}
            shouldPlay={true}
            isLooping={false}
            isMuted={false}
            onPlaybackStatusUpdate={handleVideoLoad}
            onError={(error) => {
              console.log('Video error:', error);
              // Fallback to gradient background
            }}
          />
        ) : (
          // Web fallback - animated gradient
          <View style={styles.webFallback}>
            <LinearGradient
              colors={[
                neonTheme.accentCyan,
                neonTheme.accentPink,
                neonTheme.accentLime,
                neonTheme.accentCyan
              ]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>RevoVend</Text>
              <Text style={styles.taglineText}>Revolutionizing Events</Text>
            </View>
          </View>
        )}

        {/* Overlay gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Controls overlay */}
      <View style={styles.controlsOverlay}>
        {/* Play/Pause button (only for video) */}
        {Platform.OS !== 'web' && isVideoLoaded && (
          <TouchableOpacity 
            style={styles.playButton}
            onPress={handlePlayPress}
            testID="video-play-button"
          >
            <Play 
              size={32} 
              color={neonTheme.textPrimary} 
              fill={isPlaying ? 'transparent' : neonTheme.textPrimary}
            />
          </TouchableOpacity>
        )}

        {/* Skip button */}
        {showSkip && (
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
            testID="video-skip-button"
          >
            <SkipForward size={20} color={neonTheme.textPrimary} />
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom branding */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.brandText}>RevoVend</Text>
        <Text style={styles.subtitleText}>Welcome to the future of events</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neonTheme.background,
  },
  videoContainer: {
    flex: 1,
    width: width,
    height: height,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: neonTheme.textPrimary,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
  taglineText: {
    fontSize: 18,
    color: neonTheme.textPrimary,
    textAlign: 'center',
    opacity: 0.9,
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
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: neonTheme.textPrimary,
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