import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { colors } from '@/theme';

const WORD = 'AcademiaOS';

export function DevourLogo({ size = 32 }: { size?: number }) {
  const travel = useRef(new Animated.Value(0)).current;
  const letterOpacity = useMemo(() => WORD.split('').map(() => new Animated.Value(1)), []);
  const [wordWidth, setWordWidth] = useState(0);
  const hasPlayed = useRef(false);

  useEffect(() => {
    if (!wordWidth || hasPlayed.current) return;
    hasPlayed.current = true;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reducedMotion) => {
        if (cancelled || reducedMotion) return;

        Animated.sequence([
          Animated.delay(180),
          Animated.parallel([
            Animated.timing(travel, {
              toValue: wordWidth + size * 0.22,
              duration: 1250,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(140),
              Animated.stagger(
                88,
                letterOpacity.map((opacity) =>
                  Animated.timing(opacity, {
                    toValue: 0,
                    duration: 1,
                    useNativeDriver: true,
                  }),
                ),
              ),
            ]),
          ]),
          Animated.delay(110),
          Animated.parallel([
            Animated.timing(travel, {
              toValue: 0,
              duration: 1,
              useNativeDriver: true,
            }),
            ...letterOpacity.map((opacity) =>
              Animated.timing(opacity, {
                toValue: 1,
                duration: 1,
                useNativeDriver: true,
              }),
            ),
          ]),
        ]).start();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [letterOpacity, size, travel, wordWidth]);

  const onWordLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && Math.abs(nextWidth - wordWidth) > 1) setWordWidth(nextWidth);
  };

  const pacmanSize = size * 0.88;
  const mouthSize = pacmanSize * 0.34;

  return (
    <View accessibilityRole="image" accessibilityLabel="AcademiaOS" style={styles.outer}>
      <View style={[styles.row, { minHeight: size * 1.15, paddingLeft: pacmanSize + size * 0.2 }]}>
        <Animated.View
          style={[
            styles.pacman,
            {
              width: pacmanSize,
              height: pacmanSize,
              borderRadius: pacmanSize / 2,
              transform: [{ translateX: travel }],
            },
          ]}
        >
          <View
            style={[
              styles.mouth,
              {
                right: -1,
                top: pacmanSize * 0.31,
                borderTopWidth: mouthSize / 2,
                borderBottomWidth: mouthSize / 2,
                borderRightWidth: mouthSize,
              },
            ]}
          />
        </Animated.View>

        <View onLayout={onWordLayout} style={styles.word}>
          {WORD.split('').map((letter, index) => (
            <Animated.Text
              key={`${letter}-${index}`}
              style={[
                styles.letter,
                {
                  fontSize: size,
                  lineHeight: size * 1.05,
                  opacity: letterOpacity[index]!,
                },
              ]}
            >
              {letter}
            </Animated.Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { alignSelf: 'center' },
  row: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  word: { flexDirection: 'row', alignItems: 'center' },
  letter: { color: colors.navy, fontWeight: '900', letterSpacing: -1.15 },
  pacman: {
    position: 'absolute',
    left: 0,
    zIndex: 3,
    backgroundColor: colors.gold,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'visible',
  },
  mouth: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.background,
  },
});
