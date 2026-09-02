import {
  useAvailableMeetingSlots,
  useBookedMeetingSlots,
  useBookMeetingSlot,
  useCancelMeetingBooking,
  useMyChildren,
} from "@skolara/api-client";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/lib/theme";
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

function slotLabel(startsAt: string | Date): string {
  return new Date(startsAt).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MeetingsScreen() {
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
      Alert.alert("Pick a child", "Choose which child the meeting is about.");
      return;
    }
    try {
      await book.mutateAsync({
        slotId,
        input: { studentId: activeStudentId, note: note || undefined },
      });
      setNote("");
      Alert.alert("Booked", "The teacher has been told.");
    } catch (error) {
      // The API distinguishes "someone just took it" from "it's gone" — worth
      // passing through, since the two need different reactions.
      Alert.alert(
        "Couldn't book that",
        error instanceof Error ? error.message : "Please try another slot.",
      );
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {(booked?.length ?? 0) > 0 && (
          <>
            <SectionLabel>Your appointments</SectionLabel>
            {booked?.map((slot) => (
              <Card key={slot.id} style={styles.slot}>
                <View style={styles.slotDetail}>
                  <Text style={styles.slotTime}>{slotLabel(slot.startsAt)}</Text>
                  <Text style={styles.slotMeta}>
                    {slot.teacherUser.firstName} {slot.teacherUser.lastName}
                    {slot.student ? ` · about ${slot.student.user.firstName}` : ""}
                  </Text>
                </View>
                <Button title="Cancel" variant="ghost" onPress={() => cancel.mutate(slot.id)} />
              </Card>
            ))}
          </>
        )}

        <SectionLabel>Book a meeting</SectionLabel>

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
          placeholder="What would you like to discuss? (optional)"
          value={note}
          onChangeText={setNote}
        />

        {isLoading && <LoadingLine label="Loading slots..." />}
        {!isLoading && available?.length === 0 && (
          <EmptyState title="No slots offered right now — teachers publish these before parents' evenings." />
        )}

        {available?.map((slot) => (
          <Card key={slot.id} style={styles.slot}>
            <View style={styles.slotDetail}>
              <Text style={styles.slotTime}>{slotLabel(slot.startsAt)}</Text>
              <Text style={styles.slotMeta}>
                {slot.teacherUser.firstName} {slot.teacherUser.lastName}
              </Text>
            </View>
            <Button
              title="Book"
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
