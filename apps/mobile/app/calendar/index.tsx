import { useCalendarEvents } from "@skolara/api-client";
import type { CalendarEvent, CalendarEventCategory } from "@skolara/types";
import { useMemo } from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";
import { useTranslation, type Locale } from "@skolara/i18n";
import { colors, spacing, typography, type Tone } from "@/lib/theme";
import { intlLocale } from "@/lib/intl";
import { Card, EmptyState, LoadingLine, Pill, Screen } from "@/lib/ui";

const CATEGORY_TONE: Record<CalendarEventCategory, Tone> = {
  HOLIDAY: "success",
  EXAM: "danger",
  MEETING: "brand",
  ACTIVITY: "brand",
  TERM_START: "warning",
  TERM_END: "warning",
  OTHER: "neutral",
};

function monthKey(date: Date, locale: Locale) {
  return date.toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric" });
}

export default function CalendarScreen() {
  const { t, locale } = useTranslation();
  // Only what's ahead — a parent opening this wants the next thing, not
  // last term's holidays.
  const from = useMemo(() => new Date().toISOString(), []);
  const { data: events, isLoading } = useCalendarEvents(from);

  const sections = useMemo(() => {
    const byMonth = new Map<string, CalendarEvent[]>();
    for (const event of events ?? []) {
      const key = monthKey(new Date(event.startsAt), locale);
      byMonth.set(key, [...(byMonth.get(key) ?? []), event]);
    }
    return [...byMonth.entries()].map(([title, data]) => ({ title, data }));
  }, [events, locale]);

  if (isLoading) {
    return (
      <Screen>
        <LoadingLine label={t("common.loading")} />
      </Screen>
    );
  }

  if (sections.length === 0) {
    return (
      <Screen>
        <EmptyState title={t("mobileFamilyWork.nothingComingUp")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.month}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const start = new Date(item.startsAt);
          return (
            <Card style={styles.event}>
              <View style={styles.date}>
                <Text style={styles.day}>{start.getDate()}</Text>
                <Text style={styles.weekday}>
                  {start.toLocaleDateString(intlLocale(locale), { weekday: "short" })}
                </Text>
              </View>
              <View style={styles.detail}>
                <Text style={styles.title}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.description}>{item.description}</Text>
                ) : null}
              </View>
              <Pill
                label={t(`eventCategory.${item.category}`)}
                tone={CATEGORY_TONE[item.category]}
              />
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  month: {
    ...typography.subheading,
    color: colors.slate[500],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  event: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  date: { minWidth: 44, alignItems: "center" },
  day: { ...typography.title, fontSize: 22, fontVariant: ["tabular-nums"] },
  weekday: { fontSize: 11, color: colors.slate[400], textTransform: "uppercase" },
  detail: { flex: 1, gap: 2 },
  title: { ...typography.subheading },
  description: { fontSize: 13, color: colors.slate[500] },
});
