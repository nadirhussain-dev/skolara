import { useTranslation } from "@skolara/i18n";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { todayKey } from "@/lib/dates";
import { palette, useTheme } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { Muted } from "@/lib/ui";

export interface DayRange {
  start: string | null;
  end: string | null;
}

/** YYYY-MM-DD for the day `offset` days from today, in the phone's timezone. */
export function dayFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return todayKey(d);
}

/**
 * Pick one day or a run of days by tapping: the first tap is the first day,
 * a later tap is the last. No typing dates, no calendar widget to fight with.
 */
export function DayRangePicker({
  value,
  onChange,
  from = -7,
  to = 30,
  skipSundays = true,
}: {
  value: DayRange;
  onChange: (range: DayRange) => void;
  /** First and last selectable day, relative to today. */
  from?: number;
  to?: number;
  skipSundays?: boolean;
}) {
  const { locale } = useTranslation();
  const { brand } = useTheme();
  const tag = locale === "ur" ? "ur-PK" : "en-GB";
  const days = useMemo(() => {
    const out: { key: string; date: Date }[] = [];
    for (let i = from; i <= to; i++) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() + i);
      if (skipSundays && date.getDay() === 0) continue;
      out.push({ key: todayKey(date), date });
    }
    return out;
  }, [from, to, skipSundays]);
  const weekday = new Intl.DateTimeFormat(tag, { weekday: "short" });
  const month = new Intl.DateTimeFormat(tag, { month: "short" });
  const today = todayKey();
  const startIndex = Math.max(0, days.findIndex((d) => d.key >= today) - 1);

  function tap(key: string) {
    if (!value.start || value.end || key < value.start) onChange({ start: key, end: null });
    else onChange({ start: value.start, end: key });
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      contentOffset={{ x: startIndex * 62, y: 0 }}
    >
      {days.map(({ key, date }) => {
        const inRange = value.start !== null && key >= value.start && key <= (value.end ?? value.start);
        const edge = key === value.start || key === value.end;
        return (
          <Pressable
            key={key}
            onPress={() => tap(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: inRange }}
            accessibilityLabel={new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long" }).format(date)}
            style={[
              styles.day,
              { borderColor: inRange ? brand[700] : palette.line, backgroundColor: edge ? brand[700] : inRange ? brand[50] : palette.surface },
            ]}
          >
            <Text style={[styles.weekday, { color: edge ? "#FFFFFF" : palette.muted }]}>{weekday.format(date)}</Text>
            <Text style={[styles.date, { color: edge ? "#FFFFFF" : palette.ink }]}>{date.getDate()}</Text>
            <Text style={[styles.month, { color: edge ? "#FFFFFF" : key === today ? brand[700] : palette.muted }]}>
              {key === today ? "•" : month.format(date)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** "Mon 14 Oct" or "Mon 14 – Wed 16 Oct · 3 days" for a picked range. */
export function RangeSummary({ value, emptyText, daysLabel }: { value: DayRange; emptyText: string; daysLabel: (count: number) => string }) {
  const { locale } = useTranslation();
  if (!value.start) return <Muted>{emptyText}</Muted>;
  const tag = locale === "ur" ? "ur-PK" : "en-GB";
  const fmt = new Intl.DateTimeFormat(tag, { weekday: "short", day: "numeric", month: "short" });
  const start = new Date(`${value.start}T12:00:00`);
  const end = new Date(`${value.end ?? value.start}T12:00:00`);
  const count = Math.round((end.getTime() - start.getTime()) / 864e5) + 1;
  return (
    <View accessibilityLiveRegion="polite">
      <Text style={{ color: palette.ink, fontWeight: "800", fontSize: 16 }}>
        {value.end && value.end !== value.start ? `${fmt.format(start)} – ${fmt.format(end)}` : fmt.format(start)}
      </Text>
      <Muted>{daysLabel(count)}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: 2 },
  day: { width: 54, height: 72, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 1 },
  weekday: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  date: { fontSize: 20, fontWeight: "800" },
  month: { fontSize: 11, fontWeight: "700" },
});
