import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
export function AppScreen({ children, scroll = true, contentContainerStyle, ...props }: ScrollViewProps & { children: React.ReactNode; scroll?: boolean }) {
  const body = scroll ? <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, contentContainerStyle]} {...props}>{children}</ScrollView> : <View style={[styles.content, styles.flex, contentContainerStyle]}>{children}</View>;
  return <SafeAreaView style={styles.safe} edges={['top']}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{body}</KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:colors.background},flex:{flex:1},content:{padding:spacing.lg,paddingBottom:48,gap:spacing.lg} });
