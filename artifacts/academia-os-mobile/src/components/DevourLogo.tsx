import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { colors } from '@/theme';

const WORD = 'AcademiaOS';
const HOLD_MS = 6000;
const EAT_STEP_MS = 110;
const EMPTY_PAUSE_MS = 220;
const WRITE_STEP_MS = 85;

type Mode = 'hold' | 'eat' | 'write';

export function DevourLogo({ size = 32 }: { size?: number }) {
  const [mode, setMode] = useState<Mode>('hold');
  const [step, setStep] = useState(0);
  const [wordWidth, setWordWidth] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setMode('hold');
      setStep(0);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    if (mode === 'hold') {
      timer = setTimeout(() => { setStep(0); setMode('eat'); }, HOLD_MS);
    } else if (mode === 'eat') {
      if (step < WORD.length) timer = setTimeout(() => setStep((value) => value + 1), EAT_STEP_MS);
      else timer = setTimeout(() => { setStep(0); setMode('write'); }, EMPTY_PAUSE_MS);
    } else if (step < WORD.length) {
      timer = setTimeout(() => setStep((value) => value + 1), WRITE_STEP_MS);
    } else {
      timer = setTimeout(() => { setStep(0); setMode('hold'); }, 250);
    }
    return () => clearTimeout(timer);
  }, [mode, reducedMotion, step]);

  const onLayout = (event: LayoutChangeEvent) => setWordWidth(event.nativeEvent.layout.width);
  const pacmanSize = size * 0.86;
  const progress = mode === 'eat' ? Math.min(step / WORD.length, 1) : 0;

  return (
    <View accessibilityRole="image" accessibilityLabel="AcademiaOS" style={styles.outer}>
      <View style={[styles.row, { minHeight: size * 1.15 }]}>
        <View onLayout={onLayout} style={styles.word}>
          {WORD.split('').map((letter, index) => {
            const visible = reducedMotion || mode === 'hold' || (mode === 'eat' ? index >= step : index < step);
            return (
              <Text key={`${letter}-${index}`} style={[styles.letter, { color: index < 8 ? '#1F5C46' : '#F4C542', fontSize: size, lineHeight: size * 1.05, opacity: visible ? 1 : 0 }]}>
                {letter}
              </Text>
            );
          })}
        </View>
        {!reducedMotion && mode === 'eat' && wordWidth > 0 && (
          <View style={[styles.pacman, {
            width: pacmanSize,
            height: pacmanSize,
            borderRadius: pacmanSize / 2,
            left: Math.max(0, progress * wordWidth - pacmanSize * 0.45),
          }]}>
            <View style={[styles.mouth, {
              top: pacmanSize * 0.31,
              borderTopWidth: pacmanSize * 0.17,
              borderBottomWidth: pacmanSize * 0.17,
              borderRightWidth: pacmanSize * 0.34,
            }]}/>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { alignSelf: 'center' },
  row: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  word: { flexDirection: 'row', alignItems: 'center' },
  letter: { fontWeight: '900', letterSpacing: -1.15 },
  pacman: {
    position: 'absolute', top: '50%', zIndex: 3, marginTop: -14,
    backgroundColor: '#F4C542', shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  mouth: {
    position: 'absolute', right: -1, width: 0, height: 0,
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
    borderRightColor: colors.background,
  },
});
