import { useCancelLeave, useLeaveBalances, useMyLeave, useRequestLeave } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { LeaveKind } from "@skolara/types";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { DayRangePicker, RangeSummary, type DayRange } from "@/components/day-picker";
import { formatDay } from "@/lib/dates";
import { palette } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { REQUEST_TONE } from "@/lib/tones";
import { Button, Card, Chip, EmptyState, Field, Meter, Muted, Pill, SectionLabel, Skeleton, Txt } from "@/lib/ui";

const KINDS: LeaveKind[] = ["CASUAL", "SICK", "UNPAID", "MATERNITY", "OTHER"];

/** A teacher's own leave: what is left, a quick request, and the answers. */
export default function LeaveScreen() {
  const { t, locale } = useTranslation();
  const balances = useLeaveBalances();
  const mine = useMyLeave();
  const request = useRequestLeave();
  const cancel = useCancelLeave();
  const [kind, setKind] = useState<LeaveKind>("CASUAL");
  const [range, setRange] = useState<DayRange>({ start: null, end: null });
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function submit() {
    if (!range.start) {
      setError(t("everyday.pickDays"));
      return;
    }
    setError(null);
    request.mutate(
      { kind, startDate: new Date(`${range.start}T00:00:00Z`), endDate: new Date(`${range.end ?? range.start}T00:00:00Z`), reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setRange({ start: null, end: null });
          setReason("");
          setSent(true);
        },
        onError: (e) => setError(e instanceof Error ? e.message : t("mobileLeave.tryAgain")),
      },
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={mine.isRefetching} onRefresh={() => { void mine.refetch(); void balances.refetch(); }} />}
    >
      <SectionLabel>{t("mobileLeave.yourAllowance")}</SectionLabel>
      {!balances.data ? (
        <Skeleton height={96} />
      ) : (
        <View style={styles.balances}>
          {balances.data.filter((b) => b.allowanceDays !== null && b.kind !== "MATERNITY").map((b) => (
            <Card key={b.kind} style={styles.balance}>
              <Muted style={{ fontSize: 13 }}>{t(`leaveKind.${b.kind}`)}</Muted>
              <Txt style={styles.big}>{b.remainingDays === 1 ? t("staffLeave.leftOne") : t("staffLeave.left", { count: b.remainingDays ?? 0 })}</Txt>
              <Meter value={b.allowanceDays ? (b.usedDays / b.allowanceDays) * 100 : 0} label={t("staffLeave.usedOf", { used: b.usedDays, total: b.allowanceDays ?? 0 })} />
            </Card>
          ))}
        </View>
      )}

      <Card>
        <Txt style={styles.title}>{t("staffLeave.ask")}</Txt>
        <View style={styles.chips}>
          {KINDS.map((k) => <Chip key={k} label={t(`leaveKind.${k}`)} active={kind === k} onPress={() => setKind(k)} />)}
        </View>
        <Txt style={styles.label}>{t("everyday.whichDays")}</Txt>
        <DayRangePicker value={range} onChange={(next) => { setRange(next); setSent(false); }} from={0} to={60} />
        <RangeSummary value={range} emptyText={t("everyday.tapDays")} daysLabel={(n) => (n === 1 ? t("staffLeave.dayOne") : t("staffLeave.days", { count: n }))} />
        <Field label={t("mobileLeave.reasonOptional")} value={reason} onChangeText={setReason} placeholder={t("mobileLeave.reasonHint")} maxLength={500} multiline />
        {error && <Txt style={{ color: palette.danger, fontWeight: "700" }}>{error}</Txt>}
        {sent && <Txt accessibilityLiveRegion="polite" style={{ color: palette.success, fontWeight: "700" }}>{t("staffLeave.sent")}</Txt>}
        <Button title={t("staffLeave.send")} onPress={submit} loading={request.isPending} />
        <Muted style={{ fontSize: 13 }}>{t("mobileLeave.hint")}</Muted>
      </Card>

      <SectionLabel>{t("mobileLeave.yourRequests")}</SectionLabel>
      {!mine.data ? (
        <Skeleton />
      ) : mine.data.length === 0 ? (
        <Card><EmptyState title={t("mobileLeave.none")} /></Card>
      ) : (
        mine.data.map((r) => (
          <Card key={r.id}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Txt style={{ color: palette.ink, fontWeight: "800" }}>{t(`leaveKind.${r.kind}`)}</Txt>
                <Muted>{formatDay(r.startDate, locale)}{formatDay(r.startDate, locale) !== formatDay(r.endDate, locale) ? ` – ${formatDay(r.endDate, locale)}` : ""}</Muted>
              </View>
              <Pill label={t(`leaveStatus.${r.status}`)} tone={REQUEST_TONE[r.status]} />
            </View>
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
  balances: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  balance: { flexBasis: "47%", flexGrow: 1, gap: 6 },
  big: { color: palette.ink, fontWeight: "800", fontSize: 20 },
  title: { color: palette.ink, fontWeight: "800", fontSize: 17 },
  label: { color: palette.ink, fontWeight: "700", fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
