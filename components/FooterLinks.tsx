import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { theme as themeObj } from '@/constants/theme';

type Props = {
  align?: 'center' | 'left' | 'right';
};

function FooterLinksComponent({ align = 'center' }: Props) {
  const router = useRouter();
  const alignment = useMemo(() => {
    if (align === 'left') return 'flex-start' as const;
    if (align === 'right') return 'flex-end' as const;
    return 'center' as const;
  }, [align]);

  return (
    <View style={[styles.container, { justifyContent: alignment }]} testID="footer-links">
      <TouchableOpacity
        onPress={() => router.push('/terms' as const)}
        style={styles.linkHit}
        testID="footer-link-terms"
      >
        <Text style={styles.link}>Terms</Text>
      </TouchableOpacity>
      <View style={styles.dot} />
      <TouchableOpacity
        onPress={() => router.push('/privacy' as const)}
        style={styles.linkHit}
        testID="footer-link-privacy"
      >
        <Text style={styles.link}>Privacy</Text>
      </TouchableOpacity>
      <View style={styles.dot} />
      <TouchableOpacity
        onPress={() => router.push('/contact' as const)}
        style={styles.linkHit}
        testID="footer-link-contact"
      >
        <Text style={styles.link}>Contact</Text>
      </TouchableOpacity>
    </View>
  );
}

export const FooterLinks = memo(FooterLinksComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  linkHit: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  link: {
    fontSize: 12,
    color: themeObj.colors.text.secondary,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: themeObj.colors.border,
    opacity: 0.8,
  },
});
