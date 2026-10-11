import { useInvoicesForStudent } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { formatCurrency } from "@skolara/utils";
import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChildSwitcher } from "@/components/child-switcher";
import { useChild } from "@/lib/child-context";
import { dayKeyOf, formatDay, todayKey } from "@/lib/dates";
import { palette } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { BrandHeader, Button, Card, EmptyState, ErrorState, Muted, Pill, Skeleton, Txt } from "@/lib/ui";

/** Every invoice for the selected child, with what is still owed and one way to pay. */
export default function FamilyFees() {
  const { t, locale } = useTranslation();
  const { child } = useChild();
  const invoices = useInvoicesForStudent(child?.id);
  const rows = (invoices.data ?? []).map((invoice) => {
    const due = Number(invoice.amountDue);
    const paid = Number(invoice.amountPaid);
    const balance = Math.max(0, due - paid);
    const overdue = balance > 0 && dayKeyOf(invoice.dueDate) < todayKey();
    return { invoice, due, paid, balance, overdue };
  });
  const owed = rows.reduce((sum, row) => sum + row.balance, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.page }} edges={["left", "right"]}>
      <BrandHeader title={t("app.tabFees")} subtitle={child ? `${child.user.firstName} ${child.user.lastName}` : undefined}>
        <ChildSwitcher />
        {invoices.data && (
          <Txt style={styles.total}>{owed > 0 ? t("app.balance", { amount: formatCurrency(owed) }) : t("app.feesClear")}</Txt>
        )}
      </BrandHeader>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={invoices.isRefetching} onRefresh={() => void invoices.refetch()} />}
      >
        {!child ? (
          <Card><EmptyState title={t("app.noChildren")} description={t("app.noChildrenBody")} /></Card>
        ) : invoices.isError ? (
          <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void invoices.refetch()} />
        ) : !invoices.data ? (
          <><Skeleton height={88} /><Skeleton height={88} /><Skeleton height={88} /></>
        ) : rows.length === 0 ? (
          <Card><EmptyState title={t("studentDetail.noInvoices")} /></Card>
        ) : (
          rows.map(({ invoice, due, paid, balance, overdue }) => (
            <Card key={invoice.id}>
              <View style={styles.rowTop}>
                <Txt style={{ flex: 1, color: palette.ink, fontWeight: "800", fontSize: 17 }}>{invoice.term}</Txt>
                <Pill
                  label={t(balance === 0 ? "invoiceStatus.PAID" : overdue ? "invoiceStatus.OVERDUE" : paid > 0 ? "invoiceStatus.PARTIALLY_PAID" : "invoiceStatus.UNPAID")}
                  tone={balance === 0 ? "success" : overdue ? "danger" : "warning"}
                />
              </View>
              <Muted>{t("app.due", { date: formatDay(invoice.dueDate, locale, true) })} · {t("studentDetail.paidOfDue", { paid: formatCurrency(paid), due: formatCurrency(due) })}</Muted>
              <Txt style={{ color: balance === 0 ? palette.success : overdue ? palette.danger : palette.ink, fontWeight: "800", fontSize: 18 }}>
                {balance === 0 ? t("app.paidInFull") : t("app.balance", { amount: formatCurrency(balance) })}
              </Txt>
            </Card>
          ))
        )}
      </ScrollView>
      {owed > 0 && (
        <View style={styles.footer}>
          <Button title={t("app.payNow")} icon="cloud-upload-outline" onPress={() => router.push("/payments/submit")} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  total: { color: "#FFFFFF", fontSize: 26, fontWeight: "800", marginTop: spacing.md, fontVariant: ["tabular-nums"] },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: palette.line, backgroundColor: palette.surface },
});
