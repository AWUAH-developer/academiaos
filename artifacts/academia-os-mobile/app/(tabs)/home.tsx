import React, {
  useCallback
} from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {
  router
} from 'expo-router';
import {
  AppScreen
} from '@/components/AppScreen';
import {
  Avatar,
  Badge,
  Card,
  ErrorState,
  LoadingState,
  Metric,
  ScreenTitle
} from '@/components/ui';
import {
  useAuth
} from '@/auth/AuthContext';
import {
  getAnnouncements,
  getAttendance,
  getFees,
  getLearners,
  getNotifications
} from '@/api/client';
import {
  useLoad
} from '@/hooks/useLoad';
import {
  learnerName,
  money,
  relativeTime
} from '@/lib/format';
import {
  canUseStaffAttendance,
  canViewAnnouncements,
  canViewAttendance,
  canViewEvents,
  canViewFees,
  canViewHomework,
  canViewLearners,
  canViewTransport,
  roleLabel
} from '@/lib/permissions';
import {
  colors,
  spacing
} from '@/theme';

export default function HomeScreen() {
  const {
    user
  } = useAuth();

  const role = user?.role;

  const loader = useCallback(
    async () => {
      if (!role) {
        return {
          learners: [],
          attendance: [],
          fees: {
            summary: [],
            charges: []
          },
          notifications: [],
          announcements: []
        };
      }

      const [
        learners,
        attendance,
        fees,
        notifications,
        announcements
      ] = await Promise.all([
        canViewLearners(role)
          ? getLearners()
          : Promise.resolve([]),

        canViewAttendance(role)
          ? getAttendance(undefined, 30)
          : Promise.resolve([]),

        canViewFees(role)
          ? getFees()
          : Promise.resolve({
              summary: [],
              charges: []
            }),

        getNotifications(true),

        canViewAnnouncements(role)
          ? getAnnouncements()
          : Promise.resolve([])
      ]);

      return {
        learners,
        attendance,
        fees,
        notifications,
        announcements
      };
    },
    [role]
  );

  const {
    data,
    loading,
    error,
    refreshing,
    reload
  } = useLoad(
    loader,
    [role]
  );

  if (!user) return null;

  if (loading && !data) {
    return (
      <AppScreen scroll={false}>
        <LoadingState />
      </AppScreen>
    );
  }

  const isParent =
    user.role === 'PARENT';

  const showLearners =
    canViewLearners(user.role);

  const showAttendance =
    canViewAttendance(user.role);

  const showFees =
    canViewFees(user.role);

  const showHomework =
    canViewHomework(user.role);

  const showTransport =
    canViewTransport(user.role);

  const showStaffAttendance =
    canUseStaffAttendance(user.role);

  const showEvents =
    canViewEvents(user.role);

  const showAnnouncements =
    canViewAnnouncements(user.role);

  const outstanding = (
    data?.fees.summary || []
  ).reduce(
    (sum, item) =>
      sum + Number(item.balance || 0),
    0
  );

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={reload}
          tintColor={colors.green}
        />
      }
    >
      <View style={styles.identity}>
        <Avatar
          uri={user.school?.logoUrl}
          name={
            user.school?.name ||
            'AcademiaOS'
          }
          size={64}
          square
        />

        <View style={styles.identityText}>
          <Text style={styles.school}>
            {user.school?.name ||
              'AcademiaOS'}
          </Text>

          <Text style={styles.welcome}>
            Welcome, {user.name}
          </Text>

          <Badge
            text={roleLabel(user.role)}
            tone="success"
          />
        </View>
      </View>

      {error ? (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      ) : null}

      <View style={styles.metrics}>
        {showLearners ? (
          <Metric
            label={
              isParent
                ? 'Children'
                : 'Learners'
            }
            value={
              data?.learners.length || 0
            }
          />
        ) : null}

        <Metric
          label="Unread alerts"
          value={
            data?.notifications.length || 0
          }
        />

        {showAttendance ? (
          <Metric
            label="30-day attendance"
            value={
              data?.attendance.length || 0
            }
          />
        ) : null}

        {showFees ? (
          <Metric
            label="Outstanding"
            value={money(
              outstanding,
              user.school?.currency ||
                'GHS'
            )}
          />
        ) : null}
      </View>

      <ScreenTitle title="Quick actions" />

      <View style={styles.actions}>
        {showLearners ? (
          <Action
            title={
              isParent
                ? 'View my children'
                : 'View learners'
            }
            symbol="👥"
            onPress={() =>
              router.push(
                '/(tabs)/learners'
              )
            }
          />
        ) : null}

        {showHomework ? (
          <Action
            title="Homework"
            symbol="📚"
            onPress={() =>
              router.push('/homework')
            }
          />
        ) : null}

        {showTransport ? (
          <Action
            title="School transport"
            symbol="🚌"
            onPress={() =>
              router.push('/transport')
            }
          />
        ) : null}

        {showStaffAttendance ? (
          <Action
            title="Staff attendance"
            symbol="🕒"
            onPress={() =>
              router.push(
                '/staff-attendance'
              )
            }
          />
        ) : null}

        {showEvents ? (
          <Action
            title="Events & PTA"
            symbol="📅"
            onPress={() =>
              router.push('/events')
            }
          />
        ) : null}

        {showAnnouncements ? (
          <Action
            title="Announcements"
            symbol="📣"
            onPress={() =>
              router.push(
                '/announcements'
              )
            }
          />
        ) : null}

        <Action
          title="Notifications"
          symbol="🔔"
          onPress={() =>
            router.push(
              '/(tabs)/notifications'
            )
          }
        />

        <Action
          title="Devices"
          symbol="📱"
          onPress={() =>
            router.push('/devices')
          }
        />
      </View>

      {showLearners &&
      data?.learners?.length ? (
        <>
          <ScreenTitle
            title={
              isParent
                ? 'My children'
                : 'Learners'
            }
            subtitle={
              isParent
                ? 'Select a child to view information permitted for your account.'
                : 'Select a learner to view information permitted for your role.'
            }
          />

          {data.learners
            .slice(0, 4)
            .map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname:
                      '/learner/[id]',
                    params: {
                      id: item.id
                    }
                  })
                }
              >
                <Card style={styles.row}>
                  <Avatar
                    uri={item.photoUrl}
                    name={learnerName(
                      item.firstName,
                      item.lastName
                    )}
                  />

                  <View style={styles.grow}>
                    <Text
                      style={styles.rowTitle}
                    >
                      {learnerName(
                        item.firstName,
                        item.lastName
                      )}
                    </Text>

                    <Text
                      style={styles.rowMeta}
                    >
                      {item.className ||
                        'Class not assigned'}

                      {item.classStream
                        ? ` · ${item.classStream}`
                        : ''}

                      {' · '}
                      {item.admissionNo}
                    </Text>
                  </View>

                  <Text
                    style={styles.chevron}
                  >
                    ›
                  </Text>
                </Card>
              </Pressable>
            ))}
        </>
      ) : null}

      {showAnnouncements &&
      data?.announcements?.length ? (
        <>
          <ScreenTitle
            title="Latest announcement"
          />

          <Card>
            <Text style={styles.rowTitle}>
              {
                data.announcements[0]
                  ?.subject
              }
            </Text>

            <Text
              numberOfLines={4}
              style={styles.body}
            >
              {
                data.announcements[0]
                  ?.body
              }
            </Text>

            <Text style={styles.time}>
              {data.announcements[0]
                ?.createdAt
                ? relativeTime(
                    data.announcements[0]
                      .createdAt
                  )
                : ''}
            </Text>
          </Card>
        </>
      ) : null}
    </AppScreen>
  );
}

function Action({
  title,
  symbol,
  onPress
}: {
  title: string;
  symbol: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && {
          opacity: 0.65
        }
      ]}
    >
      <Text style={styles.actionIcon}>
        {symbol}
      </Text>

      <Text style={styles.actionText}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.navy,
    padding: spacing.lg,
    borderRadius: 20
  },
  identityText: {
    flex: 1,
    gap: 4
  },
  school: {
    fontSize: 19,
    fontWeight: '900',
    color: '#fff'
  },
  welcome: {
    color: '#DCE7F7'
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  action: {
    width: '47%',
    minHeight: 110,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 10
  },
  actionIcon: {
    fontSize: 27
  },
  actionText: {
    fontWeight: '800',
    color: colors.navy
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  grow: {
    flex: 1
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text
  },
  rowMeta: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 3
  },
  chevron: {
    fontSize: 30,
    color: colors.muted
  },
  body: {
    color: colors.text,
    lineHeight: 21,
    marginTop: 8
  },
  time: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 8
  }
});
