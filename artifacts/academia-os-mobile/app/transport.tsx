import React, {
  useCallback
} from 'react';
import {
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenTitle
} from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { getTransport } from '@/api/client';
import { useLoad } from '@/hooks/useLoad';
import { colors, spacing } from '@/theme';

const scanLabels: Record<string, string> = {
  MORNING_BOARD: 'Morning boarding',
  ARRIVED_SCHOOL: 'Arrived at school',
  AFTERNOON_BOARD: 'Afternoon boarding',
  DROPPED_OFF: 'Dropped off'
};

function personName(
  firstName: string,
  lastName: string
) {
  return `${firstName} ${lastName}`.trim();
}

function dateTime(value: string) {
  return new Date(value).toLocaleString(
    'en-GH',
    {
      dateStyle: 'medium',
      timeStyle: 'short'
    }
  );
}

export default function TransportScreen() {
  const { user } = useAuth();

  const loader = useCallback(
    () => getTransport(),
    []
  );

  const {
    data,
    loading,
    error,
    refreshing,
    reload
  } = useLoad(loader, []);

  if (loading && !data) {
    return (
      <AppScreen scroll={false}>
        <LoadingState label="Loading transport information…" />
      </AppScreen>
    );
  }

  const isParent =
    user?.role === 'PARENT';

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
        title={
          isParent
            ? 'Transport for my children'
            : 'School transport'
        }
        subtitle={
          isParent
            ? 'Routes, stops, vehicle information and recent movement updates for children linked to your account.'
            : 'Active transport assignments and recent learner movement records.'
        }
      />

      {error ? (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      ) : null}

      <ScreenTitle
        title="Active assignments"
      />

      {!data?.assignments.length ? (
        <EmptyState
          title="No active transport assignment"
          message={
            isParent
              ? 'None of your linked children currently has an active school transport assignment.'
              : 'No active learner transport assignments were found.'
          }
        />
      ) : (
        data.assignments.map((item) => (
          <Card key={item.id}>
            <View style={styles.top}>
              <View style={styles.grow}>
                <Text style={styles.name}>
                  {personName(
                    item.learnerFirstName,
                    item.learnerLastName
                  )}
                </Text>

                <Text style={styles.admission}>
                  {item.admissionNo}
                </Text>
              </View>

              <Badge
                text="active"
                tone="success"
              />
            </View>

            <Info
              label="Route"
              value={item.routeName}
            />

            <Info
              label="Stop"
              value={
                item.stopName ||
                'No stop selected'
              }
            />

            <Info
              label="Pickup time"
              value={
                item.pickupTime ||
                item.morningStartTime ||
                'Not recorded'
              }
            />

            <Info
              label="Drop-off time"
              value={
                item.dropOffTime ||
                item.afternoonStartTime ||
                'Not recorded'
              }
            />

            <Info
              label="Vehicle"
              value={
                item.vehicle
                  ? `${item.vehicle.name} · ${item.vehicle.registrationNo}`
                  : 'No vehicle assigned'
              }
            />

            {item.vehicle?.driverName ? (
              <Info
                label="Driver"
                value={[
                  item.vehicle.driverName,
                  item.vehicle.driverPhone
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ) : null}

            {item.vehicle?.attendantName ? (
              <Info
                label="Attendant"
                value={
                  item.vehicle.attendantName
                }
              />
            ) : null}
          </Card>
        ))
      )}

      <ScreenTitle
        title="Recent movement updates"
      />

      {!data?.scans.length ? (
        <EmptyState
          title="No transport updates"
          message="Boarding, arrival and drop-off updates will appear here."
        />
      ) : (
        data.scans.map((item) => (
          <Card key={item.id}>
            <View style={styles.top}>
              <View style={styles.grow}>
                <Text style={styles.name}>
                  {personName(
                    item.learnerFirstName,
                    item.learnerLastName
                  )}
                </Text>

                <Text style={styles.date}>
                  {dateTime(item.scannedAt)}
                </Text>
              </View>

              <Badge
                text={
                  scanLabels[item.type] ||
                  item.type
                    .toLowerCase()
                    .replaceAll('_', ' ')
                }
                tone="success"
              />
            </View>

            <Text style={styles.route}>
              {item.routeName ||
                'School transport'}

              {item.stopName
                ? ` · ${item.stopName}`
                : ''}
            </Text>

            {item.vehicle ? (
              <Text style={styles.vehicle}>
                🚌 {item.vehicle.name} ·{' '}
                {item.vehicle.registrationNo}
              </Text>
            ) : null}
          </Card>
        ))
      )}
    </AppScreen>
  );
}

function Info({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.value}>
        {value}
      </Text>
    </View>
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
  name: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900'
  },
  admission: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3
  },
  info: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  value: {
    color: colors.text,
    fontWeight: '700',
    marginTop: 4
  },
  date: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  route: {
    color: colors.text,
    fontWeight: '800',
    marginTop: spacing.md
  },
  vehicle: {
    color: colors.muted,
    marginTop: spacing.sm
  }
});
