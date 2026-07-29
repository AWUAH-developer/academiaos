import React, {
  useCallback,
  useMemo
} from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {
  Redirect,
  router,
  useLocalSearchParams
} from 'expo-router';
import {
  AppScreen
} from '@/components/AppScreen';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Metric,
  ScreenTitle
} from '@/components/ui';
import {
  getAttendance,
  getFees,
  getLearners,
  getPayments,
  getReports,
  getResults
} from '@/api/client';
import {
  useLoad
} from '@/hooks/useLoad';
import {
  learnerName,
  money,
  shortDate
} from '@/lib/format';
import {
  canRecordAttendance,
  canViewAttendance,
  canViewFees,
  canViewLearners,
  canViewReports,
  canViewResults
} from '@/lib/permissions';
import {
  useAuth
} from '@/auth/AuthContext';
import {
  colors,
  spacing
} from '@/theme';

export default function LearnerDetails() {
  const {
    id
  } = useLocalSearchParams<{
    id: string;
  }>();

  const {
    user
  } = useAuth();

  const role = user?.role;

  const loader = useCallback(
    async () => {
      if (!role) {
        return {
          learner: undefined,
          attendance: [],
          fees: {
            summary: [],
            charges: []
          },
          payments: [],
          results: [],
          reports: []
        };
      }

      const learners =
        await getLearners(id);

      const [
        attendance,
        fees,
        payments,
        results,
        reports
      ] = await Promise.all([
        canViewAttendance(role)
          ? getAttendance(id, 120)
          : Promise.resolve([]),

        canViewFees(role)
          ? getFees(id)
          : Promise.resolve({
              summary: [],
              charges: []
            }),

        canViewFees(role)
          ? getPayments(id)
          : Promise.resolve([]),

        canViewResults(role)
          ? getResults(id)
          : Promise.resolve([]),

        canViewReports(role)
          ? getReports(id)
          : Promise.resolve([])
      ]);

      return {
        learner: learners[0],
        attendance,
        fees,
        payments,
        results,
        reports
      };
    },
    [id, role]
  );

  const {
    data,
    loading,
    error,
    refreshing,
    reload
  } = useLoad(
    loader,
    [id, role]
  );

  const currency =
    user?.school?.currency || 'GHS';

  const showAttendance =
    canViewAttendance(role);

  const showFees =
    canViewFees(role);

  const showResults =
    canViewResults(role);

  const showReports =
    canViewReports(role);

  const balance = Number(
    data?.fees.summary[0]?.balance || 0
  );

  const attendanceSummary =
    useMemo(
      () => ({
        present:
          data?.attendance.filter(
            (item) =>
              item.status === 'PRESENT'
          ).length || 0,

        absent:
          data?.attendance.filter(
            (item) =>
              item.status === 'ABSENT'
          ).length || 0,

        late:
          data?.attendance.filter(
            (item) =>
              item.status === 'LATE'
          ).length || 0
      }),
      [data]
    );

  if (
    user &&
    !canViewLearners(user.role)
  ) {
    return (
      <Redirect href="/(tabs)/home" />
    );
  }

  if (loading && !data) {
    return (
      <AppScreen scroll={false}>
        <LoadingState />
      </AppScreen>
    );
  }

  if (error && !data) {
    return (
      <AppScreen>
        <ErrorState
          message={error}
          onRetry={reload}
        />
      </AppScreen>
    );
  }

  if (!data?.learner) {
    return (
      <AppScreen>
        <EmptyState
          title="Learner unavailable"
          message="This learner is not authorised for your account."
        />
      </AppScreen>
    );
  }

  const learner = data.learner;

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={reload}
        />
      }
    >
      <View style={styles.hero}>
        <Avatar
          uri={learner.photoUrl}
          name={learnerName(
            learner.firstName,
            learner.lastName
          )}
          size={88}
        />

        <View style={styles.grow}>
          <Text style={styles.name}>
            {learnerName(
              learner.firstName,
              learner.lastName
            )}
          </Text>

          <Text style={styles.meta}>
            {learner.className ||
              'Class not assigned'}

            {learner.classStream
              ? ` · ${learner.classStream}`
              : ''}
          </Text>

          <Text style={styles.admission}>
            {learner.admissionNo}
          </Text>

          <Badge
            text={
              learner.status.toLowerCase()
            }
            tone={
              learner.status === 'ACTIVE'
                ? 'success'
                : 'warning'
            }
          />
        </View>
      </View>

      {canRecordAttendance(role) ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname:
                '/attendance-record',
              params: {
                learnerId: learner.id,
                learnerName:
                  learnerName(
                    learner.firstName,
                    learner.lastName
                  )
              }
            })
          }
        >
          <Card
            style={
              styles.attendanceAction
            }
          >
            <Text
              style={styles.actionTitle}
            >
              Record today’s attendance
            </Text>

            <Text
              style={styles.actionCopy}
            >
              Available because your role
              has attendance-recording
              permission.
            </Text>
          </Card>
        </Pressable>
      ) : null}

      <View style={styles.metrics}>
        {showAttendance ? (
          <>
            <Metric
              label="Present"
              value={
                attendanceSummary.present
              }
            />

            <Metric
              label="Absent"
              value={
                attendanceSummary.absent
              }
            />

            <Metric
              label="Late"
              value={
                attendanceSummary.late
              }
            />
          </>
        ) : null}

        {showFees ? (
          <Metric
            label="Fee balance"
            value={money(
              balance,
              currency
            )}
          />
        ) : null}
      </View>

      {showAttendance ? (
        <Section title="Recent attendance">
          {!data.attendance.length ? (
            <Text style={styles.muted}>
              No attendance records.
            </Text>
          ) : (
            data.attendance
              .slice(0, 8)
              .map((item) => (
                <View
                  key={item.id}
                  style={styles.line}
                >
                  <Text
                    style={styles.lineMain}
                  >
                    {shortDate(item.date)}
                  </Text>

                  <Badge
                    text={item.status
                      .toLowerCase()
                      .replaceAll('_', ' ')}
                    tone={
                      item.status === 'PRESENT'
                        ? 'success'
                        : item.status ===
                            'ABSENT'
                          ? 'danger'
                          : 'warning'
                    }
                  />
                </View>
              ))
          )}
        </Section>
      ) : null}

      {showFees ? (
        <>
          <Section title="Fee charges">
            {!data.fees.charges.length ? (
              <Text style={styles.muted}>
                No fee charges available.
              </Text>
            ) : (
              data.fees.charges
                .slice(0, 8)
                .map((item) => (
                  <View
                    key={item.id}
                    style={styles.line}
                  >
                    <View style={styles.grow}>
                      <Text
                        style={styles.lineMain}
                      >
                        {item.description}
                      </Text>

                      <Text
                        style={styles.muted}
                      >
                        {item.category ||
                          'School charge'}
                        {' · '}
                        {shortDate(
                          item.createdAt
                        )}
                      </Text>
                    </View>

                    <Text
                      style={styles.amount}
                    >
                      {money(
                        item.amount,
                        currency
                      )}
                    </Text>
                  </View>
                ))
            )}
          </Section>

          <Section title="Payment receipts">
            {!data.payments.length ? (
              <Text style={styles.muted}>
                No payments available.
              </Text>
            ) : (
              data.payments
                .slice(0, 8)
                .map((item) => (
                  <View
                    key={item.id}
                    style={styles.line}
                  >
                    <View style={styles.grow}>
                      <Text
                        style={styles.lineMain}
                      >
                        {item.receiptNo ||
                          item.reference ||
                          'Payment'}
                      </Text>

                      <Text
                        style={styles.muted}
                      >
                        {item.method}
                        {' · '}
                        {shortDate(
                          item.createdAt
                        )}
                      </Text>
                    </View>

                    <Text
                      style={styles.positive}
                    >
                      {money(
                        item.amount,
                        currency
                      )}
                    </Text>
                  </View>
                ))
            )}
          </Section>
        </>
      ) : null}

      {showResults ? (
        <Section title="Approved results">
          {!data.results.length ? (
            <Text style={styles.muted}>
              No approved results available.
            </Text>
          ) : (
            data.results
              .slice(0, 12)
              .map((item) => (
                <View
                  key={item.id}
                  style={styles.line}
                >
                  <View style={styles.grow}>
                    <Text
                      style={styles.lineMain}
                    >
                      {item.subject}
                    </Text>

                    <Text
                      style={styles.muted}
                    >
                      {item.term}
                      {' · '}
                      {item.academicYear}
                    </Text>
                  </View>

                  <Text style={styles.score}>
                    {item.totalScore ?? '–'}

                    {item.grade
                      ? ` · ${item.grade}`
                      : ''}
                  </Text>
                </View>
              ))
          )}
        </Section>
      ) : null}

      {showReports ? (
        <Section title="Published terminal reports">
          {!data.reports.length ? (
            <Text style={styles.muted}>
              No published reports available.
            </Text>
          ) : (
            data.reports.map((item) => (
              <View
                key={item.id}
                style={styles.line}
              >
                <View style={styles.grow}>
                  <Text
                    style={styles.lineMain}
                  >
                    {item.term}
                    {' · '}
                    {item.academicYear}
                  </Text>

                  <Text
                    style={styles.muted}
                  >
                    Published{' '}
                    {shortDate(
                      item.publishedAt
                    )}
                  </Text>
                </View>

                <Badge
                  text={
                    item.status.toLowerCase()
                  }
                  tone="success"
                />
              </View>
            ))
          )}
        </Section>
      ) : null}
    </AppScreen>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <ScreenTitle title={title} />
      <Card>{children}</Card>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.navy,
    padding: spacing.lg,
    borderRadius: 20
  },
  grow: {
    flex: 1
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff'
  },
  meta: {
    color: '#D8E4F3',
    marginTop: 4
  },
  admission: {
    color: '#8FE3C0',
    fontWeight: '800',
    marginVertical: 5
  },
  attendanceAction: {
    backgroundColor:
      colors.greenSoft,
    borderColor: colors.green
  },
  actionTitle: {
    fontWeight: '900',
    color: colors.green
  },
  actionCopy: {
    color: colors.text,
    marginTop: 4
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor:
      colors.border
  },
  lineMain: {
    fontWeight: '800',
    color: colors.text
  },
  muted: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3
  },
  amount: {
    fontWeight: '900',
    color: colors.text
  },
  positive: {
    fontWeight: '900',
    color: colors.success
  },
  score: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.navy
  }
});
