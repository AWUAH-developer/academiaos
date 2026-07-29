import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Redirect, router } from 'expo-router';
import { AppScreen } from '@/components/AppScreen';
import {
  Button,
  Card,
  Field,
  ScreenTitle
} from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { colors, spacing } from '@/theme';

export default function ChangePasswordScreen() {
  const {
    user,
    changePassword
  } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      router.replace('/(tabs)/home');
    }
  }, [user]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  async function submit() {
    if (
      next.length < 8 ||
      !/[A-Z]/.test(next) ||
      !/[a-z]/.test(next) ||
      !/[0-9]/.test(next)
    ) {
      setError(
        'Use at least 8 characters with uppercase, lowercase and a number.'
      );
      return;
    }

    if (next !== confirm) {
      setError('The new passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await changePassword(
        current,
        next,
        confirm
      );

      router.replace('/(tabs)/home');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Password setup failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen>
      <ScreenTitle
        title="Create your private password"
        subtitle="Replace the temporary password before opening school records. This private-password setup is permitted once."
      />

      <Card>
        <Field
          label="Temporary password"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
        />

        <Field
          label="New private password"
          value={next}
          onChangeText={setNext}
          secureTextEntry
        />

        <Field
          label="Confirm private password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}

        <Text style={styles.hint}>
          8 to 128 characters. Include uppercase,
          lowercase and a number.
        </Text>

        <Button
          title="Save private password"
          loading={loading}
          onPress={submit}
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.danger,
    fontWeight: '700'
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm
  }
});
