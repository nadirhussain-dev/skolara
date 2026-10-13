import { useAvailableMeetingSlots, useBookMeetingSlot, useBookedMeetingSlots, useCancelMeetingBooking, useMyMeetingSlots, useWithdrawMeetingSlot, type MeetingSlotDetail } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChildSwitcher } from "@/components/child-switcher";
import { ChildProvider, useChild } from "@/lib/child-context";
import { palette, useTheme } from "@/lib/school-theme";
import { useSession } from "@/lib/session";
import { radius, spacing } from "@/lib/theme";
import { Avatar, Button, Card, EmptyState, Field, Muted, SectionLabel, Skeleton, Txt } from "@/lib/ui";

/** Parent–teacher meetings: book one of the times a teacher has offered, or cancel. */
export default function MeetingsScreen() {
  const session = useSession();
  if (!session.isLoaded) return null;
  if (session.role === "TEACHER") return <TeacherMeetings />;
  return (
    <ChildProvider>
      <Meetings />
    </ChildProvider>
  );
}

/** A teacher's own slots: who has booked which time, and the free ones to withdraw. */
function TeacherMeetings() {
  const { t, locale } = useTranslation();
  const slots = useMyMeetingSlots();
  const withdraw = useWithdrawMeetingSlot();
  const tag = locale === "ur" ? "ur-PK" : "en-GB";
  const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" });
  const day = new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long" });
  const upcoming = (slots.data ?? []).filter((s) => new Date(s.endsAt) > new Date());
  const days = new Map<string, MeetingSlotDetail[]>();
  for (const slot of upcoming) {
    const key = day.format(new Date(slot.startsAt));
    days.set(key, [...(days.get(key) ?? []), slot]);
  }
  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={slots.isRefetching} onRefresh={() => void slots.refetch()} />}>
      <Muted>{t("everyday.offerOnWeb")}</Muted>
      {!slots.data ? (
        <Skeleton />
      ) : upcoming.length === 0 ? (
        <Card><EmptyState title={t("meetings.noSlots")} description={t("meetings.noSlotsBody")} /></Card>
      ) : (
        [...days.entries()].map(([label, list]) => (
          <View key={label} style={{ gap: spacing.sm }}>
            <SectionLabel>{label}</SectionLabel>
            <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
              {list.map((slot, i) => (
                <View key={slot.id} style={[styles.slotRow, i > 0 && { borderTopWidth: 1, borderTopColor: palette.line }]}>
                  <Txt style={[styles.strong, { width: 72 }]}>{time.format(new Date(slot.startsAt))}</Txt>
                  {slot.bookedByParentUser && slot.student ? (
                    <View style={{ flex: 1 }}>
                      <Txt style={{ color: palette.ink, fontWeight: "700" }}>{slot.student.user.firstName} {slot.student.user.lastName}</Txt>
                      <Muted style={{ fontSize: 13 }}>{slot.bookedByParentUser.firstName} {slot.bookedByParentUser.lastName}{slot.note ? ` · “${slot.note}”` : ""}</Muted>
                    </View>
                  ) : (
                    <>
                      <Muted style={{ flex: 1 }}>{t("meetings.openForBooking")}</Muted>
                      <Button title={t("meetings.withdraw")} variant="ghost" onPress={() => withdraw.mutate(slot.id)} />
                    </>
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Meetings() {
  const { t, locale } = useTranslation();
  const { brand } = useTheme();
  const { child } = useChild();
  const available = useAvailableMeetingSlots();
  const booked = useBookedMeetingSlots();
  const book = useBookMeetingSlot();
  const cancel = useCancelMeetingBooking();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const tag = locale === "ur" ? "ur-PK" : "en-GB";
  const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" });
  const day = new Intl.DateTimeFormat(tag, { weekday: "long", day: "numeric", month: "long" });

  // Group what's on offer by teacher, then by day.
  const groups = new Map<string, { teacher: MeetingSlotDetail["teacherUser"]; days: Map<string, MeetingSlotDetail[]> }>();
  for (const slot of available.data ?? []) {
    const g = groups.get(slot.teacherUser.id) ?? { teacher: slot.teacherUser, days: new Map() };
    const key = day.format(new Date(slot.startsAt));
    g.days.set(key, [...(g.days.get(key) ?? []), slot]);
    groups.set(slot.teacherUser.id, g);
  }

  function pick(slot: MeetingSlotDetail) {
    if (!child) return;
    setStatus(null);
    book.mutate(
      { slotId: slot.id, input: { studentId: child.id, note: note.trim() || undefined } },
      {
        onSuccess: () => { setNote(""); setStatus({ ok: true, text: t("everyday.bookedWith", { teacher: `${slot.teacherUser.firstName} ${slot.teacherUser.lastName}`, time: `${day.format(new Date(slot.startsAt))}, ${time.format(new Date(slot.startsAt))}` }) }); },
        onError: (e) => setStatus({ ok: false, text: e instanceof Error ? e.message : t("mobileMeetings.tryAnotherSlot") }),
      },
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={available.isRefetching} onRefresh={() => { void available.refetch(); void booked.refetch(); }} />}
    >
      {(booked.data ?? []).length > 0 && (
        <>
          <SectionLabel>{t("mobileMeetings.yourAppointments")}</SectionLabel>
          {(booked.data ?? []).map((slot) => (
            <Card key={slot.id} style={{ borderColor: brand[300], borderWidth: 1 }}>
              <View style={styles.row}>
                <Avatar name={`${slot.teacherUser.firstName} ${slot.teacherUser.lastName}`} />
                <View style={{ flex: 1 }}>
                  <Txt style={styles.strong}>{day.format(new Date(slot.startsAt))}, {time.format(new Date(slot.startsAt))}</Txt>
                  <Muted>{slot.teacherUser.firstName} {slot.teacherUser.lastName}{slot.student ? t("mobileMeetings.aboutChild", { student: slot.student.user.firstName }) : ""}</Muted>
                </View>
              </View>
              {slot.note ? <Muted>“{slot.note}”</Muted> : null}
              <Button title={t("everyday.cancelBooking")} variant="danger" onPress={() => cancel.mutate(slot.id)} loading={cancel.isPending} />
            </Card>
          ))}
        </>
      )}

      <SectionLabel>{t("mobileMeetings.bookMeeting")}</SectionLabel>
      <Card>
        {child && <Muted>{t("everyday.aboutChild", { child: `${child.user.firstName} ${child.user.lastName}` })}</Muted>}
        <ChildSwitcher />
        <Field label={t("mobileMeetings.noteHint")} value={note} onChangeText={setNote} maxLength={500} />
      </Card>
      {status && <Txt accessibilityLiveRegion="polite" style={{ color: status.ok ? palette.success : palette.danger, fontWeight: "700" }}>{status.text}</Txt>}
      {!available.data ? (
        <Skeleton />
      ) : groups.size === 0 ? (
        <Card><EmptyState title={t("mobileMeetings.noSlots")} /></Card>
      ) : (
        [...groups.values()].map((g) => (
          <Card key={g.teacher.id}>
            <View style={styles.row}>
              <Avatar name={`${g.teacher.firstName} ${g.teacher.lastName}`} />
              <Txt style={styles.strong}>{g.teacher.firstName} {g.teacher.lastName}</Txt>
            </View>
            {[...g.days.entries()].map(([label, slots]) => (
              <View key={label} style={{ gap: spacing.sm }}>
                <Muted style={{ fontWeight: "700" }}>{label}</Muted>
                <View style={styles.times}>
                  {slots.map((slot) => (
                    <Pressable
                      key={slot.id}
                      onPress={() => pick(slot)}
                      disabled={book.isPending || !child}
                      accessibilityRole="button"
                      accessibilityLabel={t("everyday.bookAt", { time: time.format(new Date(slot.startsAt)) })}
                      style={({ pressed }) => [styles.time, { borderColor: brand[300], backgroundColor: pressed ? brand[50] : palette.surface }]}
                    >
                      <Text style={{ color: brand[700], fontWeight: "800", fontVariant: ["tabular-nums"] }}>{time.format(new Date(slot.startsAt))}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  strong: { color: palette.ink, fontWeight: "800", fontSize: 16 },
  times: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slotRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 56 },
  time: { minWidth: 76, minHeight: 44, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
});
