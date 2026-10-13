import { useCalendarEvents } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { CalendarEvent, CalendarEventCategory } from "@skolara/types";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { palette } from "@/lib/school-theme";
import { radius, spacing } from "@/lib/theme";
import { Card, EmptyState, ErrorState, Muted, SectionLabel, Skeleton, Txt } from "@/lib/ui";

/** Same colours as the web calendar, so a holiday looks like a holiday everywhere. */
const COLOUR: Record<CalendarEventCategory, { bg: string; fg: string }> = {
  HOLIDAY: { bg: "#D1FAE5", fg: "#065F46" },
  EXAM: { bg: "#FEE2E2", fg: "#991B1B" },
  MEETING: { bg: "#EDE9FE", fg: "#5B21B6" },
  ACTIVITY: { bg: "#FEF3C7", fg: "#92400E" },
  TERM_START: { bg: "#E0F2FE", fg: "#075985" },
  TERM_END: { bg: "#E0F2FE", fg: "#075985" },
  OTHER: { bg: "#E2E8F0", fg: "#334155" },
};

/** What's coming up at school, month by month: holidays, exams and events. */
export default function CalendarScreen() {
  const { t, locale } = useTranslation();
  const [from] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  });
  const events = useCalendarEvents(from);
  const tag = locale === "ur" ? "ur-PK" : "en-GB";
  const monthName = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" });
  const dayNum = (e: CalendarEvent) => new Intl.DateTimeFormat(tag, { day: "numeric", timeZone: e.allDay ? "UTC" : undefined }).format(new Date(e.startsAt));
  const weekday = (e: CalendarEvent) => new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: e.allDay ? "UTC" : undefined }).format(new Date(e.startsAt));
  const span = (e: CalendarEvent) => {
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: e.allDay ? "UTC" : undefined };
    const start = new Intl.DateTimeFormat(tag, opts).format(new Date(e.startsAt));
    const end = new Intl.DateTimeFormat(tag, opts).format(new Date(e.endsAt));
    if (start !== end) return `${start} – ${end}`;
    if (e.allDay) return t("calendar.allDay");
    const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" });
    return `${time.format(new Date(e.startsAt))} – ${time.format(new Date(e.endsAt))}`;
  };

  const months = new Map<string, CalendarEvent[]>();
  for (const event of events.data ?? []) {
    const key = monthName.format(new Date(event.startsAt));
    months.set(key, [...(months.get(key) ?? []), event]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={events.isRefetching} onRefresh={() => void events.refetch()} />}>
      {events.isError ? (
        <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void events.refetch()} />
      ) : !events.data ? (
        <><Skeleton height={64} /><Skeleton height={64} /></>
      ) : events.data.length === 0 ? (
        <Card><EmptyState title={t("calendar.nothingOnCalendar")} description={t("mobileFamilyWork.nothingComingUp")} /></Card>
      ) : (
        [...months.entries()].map(([month, list]) => (
          <View key={month} style={{ gap: spacing.sm }}>
            <SectionLabel>{month}</SectionLabel>
            {list.map((event) => {
              const colour = COLOUR[event.category];
              return (
                <View key={event.id} style={styles.event}>
                  <View style={[styles.date, { backgroundColor: colour.bg }]}>
                    <Text style={{ color: colour.fg, fontWeight: "800", fontSize: 20 }}>{dayNum(event)}</Text>
                    <Text style={{ color: colour.fg, fontWeight: "700", fontSize: 11, textTransform: "uppercase" }}>{weekday(event)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt style={{ color: palette.ink, fontWeight: "800", fontSize: 16 }}>{event.title}</Txt>
                    <Muted style={{ fontSize: 13 }}>{t(`eventCategory.${event.category}`)} · {span(event)}</Muted>
                    {event.description ? <Muted style={{ fontSize: 13 }}>{event.description}</Muted> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  event: { flexDirection: "row", gap: spacing.md, alignItems: "center", backgroundColor: palette.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: palette.line },
  date: { width: 56, height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
