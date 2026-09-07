import {
  useAvailableMeetingSlots,
  useBookedMeetingSlots,
  useBookMeetingSlot,
  useCancelMeetingBooking,
  useMyChildren,
} from "@skolara/api-client";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation, type Locale } from "@skolara/i18n";
import { colors, spacing, typography } from "@/lib/theme";
import { intlLocale } from "@/lib/intl";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  LoadingLine,
  Screen,
  SectionLabel,
} from "@/lib/ui";

function slotLabel(startsAt: string | Date, locale: Locale): string {
  return new Date(startsAt).toLocaleString(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MeetingsScreen() {
  const { t, locale } = useTranslation();
  const { data: children } = useMyChildren();
  const { data: available, isLoading } = useAvailableMeetingSlots();
  const { data: booked } = useBookedMeetingSlots();
  const book = useBookMeetingSlot();
  const cancel = useCancelMeetingBooking();

  const [studentId, setStudentId] = useState<string>();
  const [note, setNote] = useState("");
  const activeStudentId = studentId ?? children?.[0]?.id;

  async function bookSlot(slotId: string) {
    if (!activeStudentId) {
      Alert.alert(t("mobileMeetings.pickChild"), t("mobileMeetings.pickChildBody"));
      return;
    }
    try {
      await book.mutateAsync({
        slotId,
        input: { studentId: activeStudentId, note: note || undefined },
      });
      setNote("");
      Alert.alert(t("mobileMeetings.booked"), t("mobileMeetings.bookedBody"));
    } catch (error) {
      // The API distinguishes "someone just took it" from "it's gone" — worth
      // passing through, since the two need different reactions.
      Alert.alert(
        t("mobileMeetings.couldNotBook"),
        error instanceof Error ? error.message : t("mobileMeetings.tryAnotherSlot"),
      );
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {(booked?.length ?? 0) > 0 && (
          <>
            <SectionLabel>{t("mobileMeetings.yourAppointments")}</SectionLabel>
            {booked?.map((slot) => (
              <Card key={slot.id} style={styles.slot}>
                <View style={styles.slotDetail}>
                  <Text style={styles.slotTime}>{slotLabel(slot.startsAt, locale)}</Text>
                  <Text style={styles.slotMeta}>
                    {slot.teacherUser.firstName} {slot.teacherUser.lastName}
                    {slot.student
                      ? t("mobileMeetings.aboutChild", {
                          student: slot.student.user.firstName,
                        })
                      : ""}
                  </Text>
                </View>
                <Button
                  title={t("common.cancel")}
                  variant="ghost"
                  onPress={() => cancel.mutate(slot.id)}
                />
              </Card>
            ))}
          </>
        )}

        <SectionLabel>{t("mobileMeetings.bookMeeting")}</SectionLabel>

        {(children?.length ?? 0) > 1 && (
          <View style={styles.chipRow}>
            {children?.map((child) => (
              <Chip
                key={child.id}
                label={child.user.firstName}
                active={activeStudentId === child.id}
                onPress={() => setStudentId(child.id)}
              />
            ))}
          </View>
        )}

        <Input
          placeholder={t("mobileMeetings.noteHint")}
          value={note}
          onChangeText={setNote}
        />

        {isLoading && <LoadingLine label={t("common.loading")} />}
        {!isLoading && available?.length === 0 && (
          <EmptyState title={t("mobileMeetings.noSlots")} />
        )}

        {available?.map((slot) => (
          <Card key={slot.id} style={styles.slot}>
            <View style={styles.slotDetail}>
              <Text style={styles.slotTime}>{slotLabel(slot.startsAt, locale)}</Text>
              <Text style={styles.slotMeta}>
                {slot.teacherUser.firstName} {slot.teacherUser.lastName}
              </Text>
            </View>
            <Button
              title={t("mobileMeetings.book")}
              variant="secondary"
              loading={book.isPending}
              onPress={() => bookSlot(slot.id)}
            />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, paddingBottom: spacing.xl },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slot: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  slotDetail: { flex: 1, gap: 2 },
  slotTime: { ...typography.subheading, fontVariant: ["tabular-nums"] },
  slotMeta: { fontSize: 13, color: colors.slate[500] },
});
