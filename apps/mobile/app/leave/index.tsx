import {
  useCancelLeave,
  useLeaveBalances,
  useMyLeave,
  useRequestLeave,
} from "@skolara/api-client";
import {
  LEAVE_KIND_LABELS,
  leaveKindSchema,
  type LeaveKind,
  type LeaveStatus,
} from "@skolara/types";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography, type Tone } from "@/lib/theme";
import { Button, Card, Chip, EmptyState, Input, LoadingLine, Pill, Screen, SectionLabel } from "@/lib/ui";

const STATUS_TONE: Record<LeaveStatus, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

/** YYYY-MM-DD, which is what a plain text field can be validated against. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function formatRange(start: string | Date, end: string | Date): string {
  const from = new Date(start).toLocaleDateString("en-GB");
  const to = new Date(end).toLocaleDateString("en-GB");
  return from === to ? from : `${from} – ${to}`;
}

export default function LeaveScreen() {
  const { data: balances, isLoading: balancesLoading } = useLeaveBalances();
  const { data: requests } = useMyLeave();
  const requestLeave = useRequestLeave();
  const cancelLeave = useCancelLeave();

  const [kind, setKind] = useState<LeaveKind>("CASUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  async function submit() {
    if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
      Alert.alert("Check the dates", "Use the format YYYY-MM-DD for both dates.");
      return;
    }
    try {
      await requestLeave.mutateAsync({
        kind,
        startDate: new Date(`${startDate}T00:00:00.000Z`),
        endDate: new Date(`${endDate}T00:00:00.000Z`),
        reason: reason || undefined,
      });
      setStartDate("");
      setEndDate("");
      setReason("");
      Alert.alert("Sent", "Your request has gone to the school office.");
    } catch (error) {
      // The API explains allowance overruns and non-working ranges precisely,
      // so show what it said rather than a generic failure.
      Alert.alert(
        "Couldn't send that",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionLabel>Your allowance this year</SectionLabel>
        {balancesLoading && <LoadingLine label="Loading balances..." />}
        <View style={styles.balanceRow}>
          {balances?.map((balance) => (
            <Card key={balance.kind} style={styles.balanceCard}>
              <Text style={styles.balanceValue}>
                {balance.remainingDays === null ? "—" : balance.remainingDays}
              </Text>
              <Text style={styles.balanceLabel}>
                {LEAVE_KIND_LABELS[balance.kind].replace(" leave", "")}
              </Text>
              <Text style={styles.balanceSub}>
                {balance.allowanceDays === null
                  ? "uncapped"
                  : `${balance.usedDays} of ${balance.allowanceDays} used`}
              </Text>
            </Card>
          ))}
        </View>

        <SectionLabel>Request leave</SectionLabel>
        <Card>
          <View style={styles.chipRow}>
            {leaveKindSchema.options.map((option) => (
              <Chip
                key={option}
                label={LEAVE_KIND_LABELS[option].replace(" leave", "")}
                active={kind === option}
                onPress={() => setKind(option)}
              />
            ))}
          </View>

          <SectionLabel>First day</SectionLabel>
          <Input placeholder="2026-09-07" value={startDate} onChangeText={setStartDate} autoCapitalize="none" />
          <SectionLabel>Last day</SectionLabel>
          <Input placeholder="2026-09-11" value={endDate} onChangeText={setEndDate} autoCapitalize="none" />
          <SectionLabel>Reason (optional)</SectionLabel>
          <Input placeholder="Family commitment" value={reason} onChangeText={setReason} />

          <Button
            title="Send request"
            onPress={submit}
            loading={requestLeave.isPending}
            style={styles.submit}
          />
          <Text style={styles.hint}>
            Sundays aren&apos;t counted. Pending requests come out of your allowance too.
          </Text>
        </Card>

        <SectionLabel>Your requests</SectionLabel>
        {requests?.length === 0 && <EmptyState title="You haven't requested any leave." />}
        {requests?.map((request) => (
          <Card key={request.id} style={styles.request}>
            <View style={styles.requestHead}>
              <Text style={styles.requestKind}>{LEAVE_KIND_LABELS[request.kind]}</Text>
              <Pill label={request.status.toLowerCase()} tone={STATUS_TONE[request.status]} />
            </View>
            <Text style={styles.requestDates}>
              {formatRange(request.startDate, request.endDate)}
            </Text>
            {request.reviewNote ? (
              <Text style={styles.reviewNote}>{request.reviewNote}</Text>
            ) : null}
            {request.status === "PENDING" && (
              <Button
                title="Withdraw"
                variant="ghost"
                onPress={() => cancelLeave.mutate(request.id)}
              />
            )}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, paddingBottom: spacing.xl },
  balanceRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  balanceCard: { flexGrow: 1, minWidth: 96, alignItems: "center", gap: 2 },
  balanceValue: { ...typography.title, fontSize: 22, fontVariant: ["tabular-nums"] },
  balanceLabel: { ...typography.subheading, fontSize: 13 },
  balanceSub: { fontSize: 11, color: colors.slate[400], textAlign: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  submit: { marginTop: spacing.sm },
  hint: { fontSize: 12, color: colors.slate[500], marginTop: spacing.sm },
  request: { gap: 4 },
  requestHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requestKind: { ...typography.subheading },
  requestDates: { fontSize: 13, color: colors.slate[500] },
  reviewNote: { fontSize: 13, color: colors.warning },
});
