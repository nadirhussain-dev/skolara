import { useCancelAbsenceRequest, useMyAbsenceRequests, useRequestAbsence } from "@skolara/api-client";
import { useTranslation, type MessageKey } from "@skolara/i18n";
import { MAX_ABSENCE_REQUEST_DAYS, type LeaveStatus } from "@skolara/types";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ChildSwitcher } from "@/components/child-switcher";
import { DayRangePicker, RangeSummary, type DayRange } from "@/components/day-picker";
import { ChildProvider, useChild } from "@/lib/child-context";
import { formatDay } from "@/lib/dates";
import { palette } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { REQUEST_TONE } from "@/lib/tones";
import { Button, Card, EmptyState, ErrorState, Field, Muted, Pill, SectionLabel, Skeleton, Txt } from "@/lib/ui";

/** Said from the family's side: "excused" is what a parent wants to read. */
const STATUS_LABEL: Record<LeaveStatus, MessageKey> = {
  PENDING: "mobileAbsences.statusPending",
  APPROVED: "mobileAbsences.statusApproved",
  REJECTED: "mobileAbsences.statusRejected",
  CANCELLED: "mobileAbsences.statusCancelled",
};

/** Tell the school a child will be (or was) away, and see what the office said. */
export default function AbsencesScreen() {
  return (
    <ChildProvider>
      <Absences />
    </ChildProvider>
  );
}

function Absences() {
  const { t, locale } = useTranslation();
  const { child } = useChild();
  const requests = useMyAbsenceRequests();
  const request = useRequestAbsence();
  const cancel = useCancelAbsenceRequest();
  const [range, setRange] = useState<DayRange>({ start: null, end: null });
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ days?: string; reason?: string; form?: string }>({});
  const [sent, setSent] = useState(false);

  function submit() {
    if (!child) return;
    const days = range.start ? Math.round((Date.parse(`${range.end ?? range.start}T12:00:00`) - Date.parse(`${range.start}T12:00:00`)) / 864e5) + 1 : 0;
    const found = {
      days: !range.start ? t("everyday.pickDays") : days > MAX_ABSENCE_REQUEST_DAYS ? t("mobileAbsences.hint", { days: MAX_ABSENCE_REQUEST_DAYS }) : undefined,
      reason: reason.trim().length < 3 ? t("mobileAbsences.addReasonBody") : undefined,
    };
    setErrors(found);
    setSent(false);
    if (found.days || found.reason || !range.start) return;
    request.mutate(
      { studentId: child.id, startDate: new Date(`${range.start}T00:00:00Z`), endDate: new Date(`${range.end ?? range.start}T00:00:00Z`), reason: reason.trim() },
      {
        onSuccess: () => {
          setRange({ start: null, end: null });
          setReason("");
          setSent(true);
        },
        onError: (e) => setErrors({ form: e instanceof Error ? e.message : t("mobileAbsences.tryAgain") }),
      },
    );
  }

  const mine = (requests.data ?? []).filter((r) => !child || r.student.id === child.id);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={requests.isRefetching} onRefresh={() => void requests.refetch()} />}
    >
      <Card>
        <Txt style={styles.title}>{child ? t("everyday.awayTitle", { child: child.user.firstName }) : t("mobileAbsences.tellSchool")}</Txt>
        <Muted>{t("mobileAbsences.intro")}</Muted>
        <ChildSwitcher />
        <Txt style={styles.label}>{t("everyday.whichDays")}</Txt>
        <DayRangePicker value={range} onChange={(next) => { setRange(next); setSent(false); }} from={-7} to={30} />
        <RangeSummary value={range} emptyText={t("everyday.tapDays")} daysLabel={(n) => (n === 1 ? t("staffLeave.dayOne") : t("staffLeave.days", { count: n }))} />
        {errors.days && <Txt style={styles.error}>{errors.days}</Txt>}
        <Field label={t("staffLeave.reason")} value={reason} onChangeText={setReason} placeholder={t("mobileAbsences.reasonHint")} maxLength={500} multiline error={errors.reason} />
        {errors.form && <Txt style={styles.error}>{errors.form}</Txt>}
        {sent && <Txt accessibilityLiveRegion="polite" style={{ color: palette.success, fontWeight: "700" }}>{t("mobileAbsences.sentBody")}</Txt>}
        <Button title={t("mobileAbsences.send")} onPress={submit} loading={request.isPending} disabled={!child} />
      </Card>

      <SectionLabel>{t("mobileAbsences.yourRequests")}</SectionLabel>
      {requests.isError ? (
        <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void requests.refetch()} />
      ) : !requests.data ? (
        <Skeleton />
      ) : mine.length === 0 ? (
        <Card><EmptyState title={t("mobileAbsences.none")} description={t("mobileAbsences.noneBody")} /></Card>
      ) : (
        mine.map((r) => (
          <Card key={r.id}>
            <View style={styles.rowTop}>
              <Txt style={{ flex: 1, color: palette.ink, fontWeight: "800" }}>
                {formatDay(r.startDate, locale)}{formatDay(r.startDate, locale) !== formatDay(r.endDate, locale) ? ` – ${formatDay(r.endDate, locale)}` : ""}
              </Txt>
              <Pill label={t(STATUS_LABEL[r.status])} tone={REQUEST_TONE[r.status]} />
            </View>
            <Muted>{r.reason}</Muted>
            {r.reviewNote ? <Txt style={{ color: palette.ink }}>“{r.reviewNote}”</Txt> : null}
            {r.status === "PENDING" && <Button title={t("staffLeave.withdraw")} variant="ghost" onPress={() => cancel.mutate(r.id)} loading={cancel.isPending} />}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { color: palette.ink, fontWeight: "800", fontSize: 17 },
  label: { color: palette.ink, fontWeight: "700", fontSize: 14, marginTop: spacing.xs },
  error: { color: palette.danger, fontWeight: "700" },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
