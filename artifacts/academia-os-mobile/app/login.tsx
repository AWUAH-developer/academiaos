import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { router } from 'expo-router';
import { AppScreen } from '@/components/AppScreen';
import { Button, Card, Field } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import type { MobileAccountType } from '@/api/types';
import { colors, spacing } from '@/theme';
import { DevourLogo } from '@/components/DevourLogo';

const accountOptions: Array<{
  type: MobileAccountType;
  title: string;
  description: string;
  symbol: string;
}> = [
  {
    type: 'PARENT',
    title: 'Parent / Guardian',
    description:
      'View your linked children, attendance, fees, results, reports, announcements and school information.',
    symbol: '👨‍👩‍👧'
  },
  {
    type: 'STAFF',
    title: 'School Staff',
    description:
      'For teachers, school staff, proprietors and administrators.',
    symbol: '🏫'
  }
];

export default function LoginScreen() {
  const {
    user,
    signIn,
    error: sessionError
  } = useAuth();

  const [accountType, setAccountType] =
    useState<MobileAccountType | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace(
        user.mustChangePassword
          ? '/change-password'
          : '/(tabs)/home'
      );
    }
  }, [user]);

  async function submit() {
    if (!accountType) {
      setError('Select Parent / Guardian or School Staff.');
      return;
    }

    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const next = await signIn(
        username,
        password,
        accountType
      );

      router.replace(
        next.mustChangePassword
          ? '/change-password'
          : '/(tabs)/home'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Sign-in failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen contentContainerStyle={styles.page}>
      <View style={styles.brand}>
        <Image
          source={require('../assets/icon.png')}
          style={styles.logo}
          resizeMode="cover"
        />

        <DevourLogo size={32} />

        <Text style={styles.tag}>
          School, family and staff connected
        </Text>
      </View>

      <Card style={styles.form}>
        <View>
          <Text style={styles.heading}>
            Continue as
          </Text>

          <Text style={styles.copy}>
            Choose the account type issued to you by
            the school.
          </Text>
        </View>

        <View style={styles.options}>
          {accountOptions.map((option) => {
            const selected =
              accountType === option.type;

            return (
              <Pressable
                key={option.type}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setAccountType(option.type);
                  setError(null);
                }}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.optionPressed
                ]}
              >
                <Text style={styles.optionSymbol}>
                  {option.symbol}
                </Text>

                <View style={styles.optionText}>
                  <Text
                    style={[
                      styles.optionTitle,
                      selected &&
                        styles.optionTitleSelected
                    ]}
                  >
                    {option.title}
                  </Text>

                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {accountType ? (
          <>
            <View style={styles.divider} />

            <Text style={styles.selectedLabel}>
              {accountType === 'PARENT'
                ? 'Parent or guardian sign-in'
                : 'School staff sign-in'}
            </Text>

            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoComplete="username"
              textContentType="username"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            {error || sessionError ? (
              <Text style={styles.error}>
                {error || sessionError}
              </Text>
            ) : null}

            <Button
              title={
                accountType === 'PARENT'
                  ? 'Sign in as parent or guardian'
                  : 'Sign in as school staff'
              }
              loading={loading}
              onPress={submit}
            />
          </>
        ) : error || sessionError ? (
          <Text style={styles.error}>
            {error || sessionError}
          </Text>
        ) : null}
      </Card>

      <Text style={styles.footer}>
        Your account type and login details are
        verified securely by AcademiaOS.
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center'
  },
  brand: {
    alignItems: 'center',
    gap: 7
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    marginBottom: 5
  },
  tag: {
    color: colors.muted,
    fontSize: 15
  },
  form: {
    gap: spacing.lg
  },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.navy
  },
  copy: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: 5
  },
  options: {
    gap: spacing.md
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.md,
    backgroundColor: colors.surface
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: colors.green,
    backgroundColor: '#ECF8F3'
  },
  optionPressed: {
    opacity: 0.72
  },
  optionSymbol: {
    fontSize: 30
  },
  optionText: {
    flex: 1
  },
  optionTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900'
  },
  optionTitleSelected: {
    color: colors.green
  },
  optionDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  divider: {
    height: 1,
    backgroundColor: colors.border
  },
  selectedLabel: {
    color: colors.navy,
    fontWeight: '900'
  },
  error: {
    color: colors.danger,
    fontWeight: '700'
  },
  footer: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  }
});
