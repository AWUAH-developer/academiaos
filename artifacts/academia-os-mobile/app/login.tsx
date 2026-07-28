import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppScreen } from '@/components/AppScreen';
import { Button, Card, Field } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { colors, spacing } from '@/theme';
import { DevourLogo } from '@/components/DevourLogo';

export default function LoginScreen() {
  const { user, signIn, error: sessionError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace(user.mustChangePassword ? '/change-password' : '/(tabs)/home');
  }, [user]);

  async function submit() {
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await signIn(username, password);
      router.replace(next.mustChangePassword ? '/change-password' : '/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return <AppScreen contentContainerStyle={styles.page}>
    <View style={styles.brand}>
      <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="cover"/>
      <DevourLogo size={32}/>
      <Text style={styles.tag}>School, family and staff connected</Text>
    </View>
    <Card style={styles.form}>
      <Text style={styles.heading}>Sign in</Text>
      <Text style={styles.copy}>Use the same AcademiaOS username and password as the school web system.</Text>
      <Field label="Username" value={username} onChangeText={setUsername} autoComplete="username" textContentType="username" autoCapitalize="none" returnKeyType="next"/>
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" returnKeyType="done" onSubmitEditing={submit}/>
      {error || sessionError ? <Text style={styles.error}>{error || sessionError}</Text> : null}
      <Button title="Sign in securely" loading={loading} onPress={submit}/>
    </Card>
    <Text style={styles.footer}>Your password and school records are verified by your private AcademiaOS server.</Text>
  </AppScreen>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' },
  brand: { alignItems: 'center', gap: 7 },
  logo: { width: 64, height: 64, borderRadius: 18, marginBottom: 5 },
  tag: { color: colors.muted, fontSize: 15 },
  form: { gap: spacing.lg },
  heading: { fontSize: 24, fontWeight: '900', color: colors.navy },
  copy: { color: colors.muted, lineHeight: 21 },
  error: { color: colors.danger, fontWeight: '700' },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 12, lineHeight: 18 },
});
