import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LOGO_SIZE = 120;

interface SplashOverlayProps {
  /** Called when the fade-out animation completes. */
  onFinish?: () => void;
  /** If true, begins the exit animation. */
  ready: boolean;
}

/**
 * An animated splash overlay shown while the app initialises.
 *
 * 1. Logo fades in with a spring scale.
 * 2. A subtle glow orb pulses behind the logo.
 * 3. When `ready` flips, the entire overlay fades out, revealing the app.
 */
export function SplashOverlay({ onFinish, ready }: SplashOverlayProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // ── Animations ──────────────────────────────────────────────
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  // Entry: logo fade-in + spring scale
  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale]);

  // Pulse loop: glow orb + logo gentle ripple
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Exit: fade whole overlay when ready
  useEffect(() => {
    if (!ready) return;
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 450,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => onFinish?.());
  }, [ready, overlayOpacity, onFinish]);

  // ── Interpolations ──────────────────────────────────────────
  const orbGlow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.2] });
  const orbScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  return (
    <Animated.View
      pointerEvents={ready ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, { opacity: overlayOpacity, zIndex: 999 }]}
    >
      <LinearGradient
        colors={['#0B0B0C', '#0E0E14', '#0F0F1A']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Center content */}
      <View style={styles.center}>
        {/* Glow orb behind the logo */}
        <Animated.View
          style={[
            styles.orb,
            {
              width: LOGO_SIZE * 1.8,
              height: LOGO_SIZE * 1.8,
              borderRadius: LOGO_SIZE * 0.9,
              opacity: orbGlow,
              transform: [{ scale: orbScale }],
            },
          ]}
        />

        {/* Logo */}
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Image
            source={require('@/assets/images/logo-glow.png')}
            style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>Zeus Chat</Text>
        <Text style={styles.subtitle}>AI conversations, reimagined</Text>
      </View>

      {/* Loading bar pinned to bottom */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 40 }]}>
        <LoadingBar color={colors.accent} />
      </View>
    </Animated.View>
  );
}

// ── Indeterminate loading bar ──────────────────────────────────

function LoadingBar({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, SCREEN_WIDTH + 20],
  });

  return (
    <View style={barStyles.track}>
      <Animated.View
        style={[barStyles.bar, { backgroundColor: color, transform: [{ translateX }] }]}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    position: 'absolute',
    backgroundColor: '#0A84FF',
  },
  title: {
    marginTop: 24,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

const barStyles = StyleSheet.create({
  track: {
    width: 160,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  bar: {
    width: 100,
    height: 3,
    borderRadius: 1.5,
  },
});
