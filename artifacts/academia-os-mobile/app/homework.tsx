import React, {
  useCallback,
  useMemo,
  useState
} from 'react';
import {
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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
import { getHomework } from '@/api/client';
import { useLoad } from '@/hooks/useLoad';
import { shortDate } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function HomeworkScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  const loader = useCallback(
    () => getHomework(),
    []
  );

  const {
    data,
    loading,
    error,
    refreshing,
    reload
  } = useLoad(loader, []);

  const rows = useMemo(() => {
    const search =
      query.trim().toLowerCase();

    return (data || []).filter((item) => {
      if (!search) return true;

      return [
        item.title,
        item.subject,
        item.className,
        item.stream,
        item.teacherName,
        item.bookTitle,
        item.pageReference,
        item.instructions
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [data, query]);

  if (loading && !data) {
    return (
      <AppScreen scroll={false}>
        <LoadingState label="Loading homework…" />
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
        title={
          user?.role === 'PARENT'
            ? 'Homework for my children'
            : 'Published homework'
        }
        subtitle={
          user?.role === 'PARENT'
            ? 'Homework is shown for the classes of children linked to your account.'
            : 'Published homework available to your authorised role.'
        }
      />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search subject, class or homework"
        placeholderTextColor="#8290A5"
        style={styles.search}
      />

      {error ? (
        <ErrorState
          message={error}
          onRetry={reload}
        />
      ) : null}

      {!rows.length ? (
        <EmptyState
          title="No published homework"
          message="Published homework will appear here when it is available."
        />
      ) : (
        rows.map((item) => (
          <Card key={item.id}>
            <View style={styles.topRow}>
              <View style={styles.grow}>
                <Text style={styles.title}>
                  {item.title}
                </Text>

                <Text style={styles.subject}>
                  {item.subject}
                </Text>
              </View>

              <Badge
                text={item.status.toLowerCase()}
                tone="success"
              />
            </View>

            <Text style={styles.meta}>
              {item.className}
              {item.stream
                ? ` · ${item.stream}`
                : ''}
              {' · '}
              {item.teacherName}
            </Text>

            <View style={styles.dateBox}>
              <Text style={styles.dateText}>
                Assigned {shortDate(item.assignedOn)}
              </Text>

              <Text style={styles.dateText}>
                {item.dueAt
                  ? `Due ${shortDate(item.dueAt)}`
                  : 'No due date'}
              </Text>
            </View>

            {item.instructions ? (
              <Text style={styles.instructions}>
                {item.instructions}
              </Text>
            ) : null}

            {item.bookTitle ||
            item.pageReference ? (
              <View style={styles.reference}>
                <Text style={styles.referenceTitle}>
                  Book or page reference
                </Text>

                <Text style={styles.referenceText}>
                  {[item.bookTitle, item.pageReference]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            ) : null}

            {item.topics.length ? (
              <View style={styles.topicWrap}>
                {item.topics.map((topic) => (
                  <View
                    key={topic.id}
                    style={styles.topic}
                  >
                    <Text style={styles.topicText}>
                      {topic.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {item.maximumScore !== null ? (
              <Text style={styles.score}>
                Maximum score: {item.maximumScore}
              </Text>
            ) : null}

            {item.hasAttachment ? (
              <View style={styles.attachment}>
                <Text style={styles.attachmentTitle}>
                  Attachment available
                </Text>

                <Text style={styles.attachmentText}>
                  {item.attachmentName ||
                    'Homework material'}
                </Text>
              </View>
            ) : null}
          </Card>
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 15
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  grow: {
    flex: 1
  },
  title: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900'
  },
  subject: {
    color: colors.green,
    fontWeight: '800',
    marginTop: 4
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm
  },
  dateBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md
  },
  dateText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700'
  },
  instructions: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.md
  },
  reference: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md
  },
  referenceTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  referenceText: {
    color: colors.text,
    fontWeight: '700',
    marginTop: 5
  },
  topicWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: spacing.md
  },
  topic: {
    backgroundColor: '#ECF8F3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  topicText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '800'
  },
  score: {
    color: colors.navy,
    fontWeight: '800',
    marginTop: spacing.md
  },
  attachment: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md
  },
  attachmentTitle: {
    color: colors.navy,
    fontWeight: '900'
  },
  attachmentText: {
    color: colors.muted,
    marginTop: 4
  }
});
