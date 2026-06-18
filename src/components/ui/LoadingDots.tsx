import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/** Three bouncing dots used as the "assistant is thinking" indicator. */
export function LoadingDots({ size = 8 }: { size?: number }) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacityFor = (i: number) =>
    anim.interpolate({
      inputRange: [0, 0.33, 0.66, 1],
      outputRange: [0.3, i === 0 ? 1 : 0.3, i === 1 ? 1 : 0.3, i === 2 ? 1 : 0.3],
    });

  return (
    <View style={styles.row}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.textSecondary, opacity: opacityFor(i) },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', height: 16 },
  dot: {},
});
