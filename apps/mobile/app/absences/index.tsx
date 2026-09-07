import {
  useCancelAbsenceRequest,
  useMyAbsenceRequests,
  useMyChildren,
  useRequestAbsence,
} from "@skolara/api-client";
import { MAX_ABSENCE_REQUEST_DAYS, type LeaveStatus } from "@skolara/types";
import { useTranslation, type Locale, type MessageKey } from "@skolara/i18n";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { intlLocale } from "@/lib/intl";
import { colors, spacing, typography, type Tone } from "@/lib/theme";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  LoadingLine,
  Pill,
  Screen,
  SectionLabel,
} from "@/lib/ui";

const STATUS_TONE: Record<LeaveStatus, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

/**
 * Said from the family's side, not the office's. "Excused" is what a parent
 * wants to read, where the admin queue calls the same state "approved".
 */
const STATUS_LABEL: Record<LeaveStatus, MessageKey> = {
  PENDING: "mobileAbsences.statusPending",
  APPROVED: "mobileAbsences.statusApproved",
  REJECTED: "mobileAbsences.statusRejected",
  CANCELLED: "mobileAbsences.statusCancelled",
};

/** YYYY-MM-DD, which is what a plain text field can be validated against. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function formatRange(start: string | Date, end: string | Date, locale: Locale): string {
  const tag = intlLocale(locale);
  const from = new Date(start).toLocaleDateString(tag);
  const to = new Date(end).toLocaleDateString(tag);
  return from === to ? from : `${from} – ${to}`;
}

export default function AbsencesScreen() {
  const { t, locale } = useTranslation();
  const { data: children } = useMyChildren();
  const { data: requests, isLoading } = useMyAbsenceRequests();
  const requestAbsence = useRequestAbsence();
  const cancelRequest = useCancelAbsenceRequest();

  const [studentId, setStudentId] = useState<string>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // A student signed in for themselves has exactly one profile, so the
  // switcher collapses to nothing and the first entry is simply them.
  const activeStudentId = studentId ?? children?.[0]?.id;

  async function submit() {
    if (!activeStudentId) return;
    if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate || startDate)) {
      Alert.alert(t("mobileAbsences.checkDates"), t("mobileAbsences.checkDatesBody"));
      return;
    }
    if (reason.trim().length < 3) {
      Alert.alert(t("mobileAbsences.addReason"), t("mobileAbsences.addReasonBody"));
      return;
    }

    try {
      await requestAbsence.mutateAsync({
        studentId: activeStudentId,
        startDate: new Date(`${startDate}T00:00:00.000Z`),
        // One-day absences are the common case, so leaving the last day blank
        // means the same day rather than being an error.
        endDate: new Date(`${endDate || startDate}T00:00:00.000Z`),
        reason: reason.trim(),
      });
      setStartDate("");
      setEndDate("");
      setReason("");
      Alert.alert(t("mobileAbsences.sent"), t("mobileAbsences.sentBody"));
    } catch (error) {
      // The API is specific about overlaps and over-long ranges, so pass on
      // what it said rather than a generic failure.
      Alert.alert(
        t("mobileAbsences.couldNotSend"),
        error instanceof Error ? error.message : t("mobileAbsences.tryAgain"),
      );
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <SectionLabel>{t("mobileAbsences.tellSchool")}</SectionLabel>
          <Text style={styles.intro}>{t("mobileAbsences.intro")}</Text>

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

          <SectionLabel>{t("mobileAbsences.firstDay")}</SectionLabel>
          <Input
            placeholder="2026-09-07"
            value={startDate}
            onChangeText={setStartDate}
            autoCapitalize="none"
          />
          <SectionLabel>{t("mobileAbsences.lastDay")}</SectionLabel>
          <Input
            placeholder="2026-09-09"
            value={endDate}
            onChangeText={setEndDate}
            autoCapitalize="none"
          />
          <SectionLabel>{t("fields.reason")}</SectionLabel>
          <Input
            placeholder={t("mobileAbsences.reasonHint")}
            value={reason}
            onChangeText={setReason}
            multiline
          />

          <Button
            title={t("mobileAbsences.send")}
            onPress={submit}
            loading={requestAbsence.isPending}
            style={styles.submit}
          />
          <Text style={styles.hint}>
            {t("mobileAbsences.hint", { days: MAX_ABSENCE_REQUEST_DAYS })}
          </Text>
        </Card>

        <SectionLabel>{t("mobileAbsences.yourRequests")}</SectionLabel>
        {isLoading && <LoadingLine />}
        {!isLoading && requests?.length === 0 && (
          <EmptyState
            title={t("mobileAbsences.none")}
            description={t("mobileAbsences.noneBody")}
          />
        )}
        {requests?.map((request) => (
          <Card key={request.id} style={styles.request}>
            <View style={styles.requestHead}>
              <Text style={styles.requestName}>{request.student.user.firstName}</Text>
              <Pill
                label={t(STATUS_LABEL[request.status])}
                tone={STATUS_TONE[request.status]}
              />
            </View>
            <Text style={styles.requestDates}>
              {formatRange(request.startDate, request.endDate, locale)}
            </Text>
            <Text style={styles.reason}>{request.reason}</Text>
            {request.reviewNote ? (
              <Text style={styles.reviewNote}>{request.reviewNote}</Text>
            ) : null}
            {request.status === "PENDING" && (
              <Button
                title={t("meetings.withdraw")}
                variant="ghost"
                onPress={() => cancelRequest.mutate(request.id)}
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
  intro: { fontSize: 13, color: colors.slate[500], marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  submit: { marginTop: spacing.sm },
  hint: { fontSize: 12, color: colors.slate[500], marginTop: spacing.sm },
  request: { gap: 4 },
  requestHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requestName: { ...typography.subheading },
  requestDates: { fontSize: 13, color: colors.slate[500] },
  reason: { fontSize: 13 },
  reviewNote: { fontSize: 13, color: colors.warning },
});
