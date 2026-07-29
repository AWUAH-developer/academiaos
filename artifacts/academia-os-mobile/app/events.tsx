import React, {
  useCallback,
  useMemo
} from 'react';
import {
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {
  AppScreen
} from '@/components/AppScreen';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenTitle
} from '@/components/ui';
import {
  getEvents
} from '@/api/client';
import {
  useLoad
} from '@/hooks/useLoad';
import {
  colors,
  spacing
} from '@/theme';

const typeLabels: Record<string, string> = {
  SCHOOL_EVENT: 'School event',
  PTA_MEETING: 'PTA meeting',
  STAFF_MEETING: 'Staff meeting',
  ACADEMIC_EVENT: 'Academic event',
  HOLIDAY: 'Holiday',
  OTHER: 'Other'
};

function dateTime(value: string) {
  return new Date(value).toLocaleString(
    'en-GH',
    {
      dateStyle: 'medium',
      timeStyle: 'short'
    }
  );
}

export default function EventsScreen() {
  const loader = useCallback(
    () => getEvents(),
    []
  );

  const {
    data,
    loading,
    error,
    refreshing,
    reload
  } = useLoad(loader, []);

  const rows = useMemo(
    () =>
      [...(data || [])].sort(
        (a, b) =>
          new Date(a.startsAt).getTime() -
          new Date(b.startsAt).getTime()
      ),
    [data]
  );

  if (loading && !data) {
    return (
      <AppScreen scroll={false}>
        <LoadingState label="Loading events…" />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={reload}
        />
      }
    >
      <ScreenTitle
        title="Events and PTA meetings"
        subtitle="Published school activities, parent meetings, staff meetings, holidays and academic events."
      />

      {error ? (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      ) : null}

      {!rows.length ? (
        <EmptyState
          title="No published events"
          message="Upcoming school events and meetings will appear here."
        />
      ) : (
        rows.map((event) => {
          const isPast =
            new Date(event.startsAt) <
            new Date();

          return (
            <Card key={event.id}>
              <View style={styles.top}>
                <View style={styles.grow}>
                  <Text style={styles.type}>
                    {typeLabels[event.eventType] ||
                      event.eventType}
                  </Text>

                  <Text style={styles.title}>
                    {event.title}
                  </Text>
                </View>

                <Badge
                  text={isPast ? 'past' : 'upcoming'}
                  tone={
                    isPast
                      ? 'warning'
                      : 'success'
                  }
                />
              </View>

              <View style={styles.dateBox}>
                <Text style={styles.date}>
                  Starts {dateTime(event.startsAt)}
                </Text>

                {event.endsAt ? (
                  <Text style={styles.date}>
                    Ends {dateTime(event.endsAt)}
                  </Text>
                ) : null}
              </View>

              {event.venue ? (
                <Text style={styles.venue}>
                  📍 {event.venue}
                </Text>
              ) : null}

              {event.description ? (
                <Text style={styles.description}>
                  {event.description}
                </Text>
              ) : null}
            </Card>
          );
        })
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  grow: {
    flex: 1
  },
  type: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  title: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4
  },
  dateBox: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: 5
  },
  date: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  venue: {
    color: colors.text,
    fontWeight: '800',
    marginTop: spacing.md
  },
  description: {
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.md
  }
});
