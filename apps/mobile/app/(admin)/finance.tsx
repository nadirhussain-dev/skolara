import { useExpenses, useFinanceOverview, useReviewExpense } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import type { Expense, FinanceOverview } from "@skolara/types";
import { formatCurrency } from "@skolara/utils";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDay, monthKey } from "@/lib/dates";
import { palette } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { BrandHeader, Button, Card, ErrorState, Field, Heading, Meter, Muted, Skeleton, Txt } from "@/lib/ui";

function ExpenseCard({ expense, overview }: { expense: Expense; overview: FinanceOverview }) {
  const { t, locale } = useTranslation();
  const review = useReviewExpense();
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const category = overview.categories.find((c) => c.categoryId === expense.categoryId);
  const onError = () => setError(t("common.somethingWentWrong"));

  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Txt style={{ color: palette.ink, fontWeight: "800", fontSize: 17 }}>{expense.payee}</Txt>
          <Muted>
            {expense.categoryName} · {formatDay(expense.spentOn, locale)}
            {expense.description ? ` · ${expense.description}` : ""}
          </Muted>
        </View>
        <Txt style={styles.amount}>{formatCurrency(expense.amount)}</Txt>
      </View>
      {category && category.budget !== null && (
        <Txt style={{ color: palette.danger, fontWeight: "700" }}>
          {t("app.takes", { category: category.name, total: formatCurrency(category.spent + expense.amount), budget: formatCurrency(category.budget) })}
        </Txt>
      )}
      {declining ? (
        <>
          <Field label={t("app.declineReason")} value={note} onChangeText={setNote} maxLength={500} autoFocus error={error} />
          <View style={styles.actions}>
            <Button title={t("common.cancel")} variant="ghost" style={{ flex: 1 }} onPress={() => { setDeclining(false); setError(null); }} />
            <Button
              title={t("app.decline")}
              variant="danger"
              style={{ flex: 1 }}
              loading={review.isPending}
              onPress={() => {
                if (!note.trim()) {
                  setError(t("app.declineReasonRequired"));
                  return;
                }
                review.mutate({ id: expense.id, decision: "DECLINED", note: note.trim() }, { onError });
              }}
            />
          </View>
        </>
      ) : (
        <>
          {error ? <Txt accessibilityRole="alert" style={{ color: palette.danger, fontWeight: "700" }}>{error}</Txt> : null}
          <View style={styles.actions}>
            <Button title={t("app.decline")} variant="danger" style={{ flex: 1 }} disabled={review.isPending} onPress={() => setDeclining(true)} />
            <Button title={t("app.approve")} variant="success" style={{ flex: 2 }} loading={review.isPending} onPress={() => review.mutate({ id: expense.id, decision: "APPROVED" }, { onError })} />
          </View>
        </>
      )}
    </Card>
  );
}

/** The owner's finance snapshot: this month's net, the budget, and expenses waiting for a decision. */
export default function AdminFinance() {
  const { t, locale } = useTranslation();
  const month = monthKey();
  const overview = useFinanceOverview(month);
  const pending = useExpenses({ month, status: "PENDING" });
  const refresh = () => {
    void overview.refetch();
    void pending.refetch();
  };
  const data = overview.data;
  const monthLabel = new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-GB", { month: "long", year: "numeric" }).format(new Date());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.page }} edges={["left", "right"]}>
      <BrandHeader title={t("app.tabFinance")} subtitle={monthLabel}>
        {data && (
          <View style={{ marginTop: spacing.md }}>
            <Txt style={styles.netLabel}>{t("app.netThisMonth")}</Txt>
            <Txt style={styles.net}>{formatCurrency(data.net)}</Txt>
          </View>
        )}
      </BrandHeader>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={overview.isRefetching || pending.isRefetching} onRefresh={refresh} />}>
        {overview.isError ? (
          <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={refresh} />
        ) : !data ? (
          <><Skeleton height={88} /><Skeleton height={120} /><Skeleton height={160} /></>
        ) : (
          <>
            <View style={styles.grid}>
              <Card style={styles.stat}><Muted style={styles.statLabel}>{t("app.income")}</Muted><Txt style={styles.statValue}>{formatCurrency(data.income)}</Txt></Card>
              <Card style={styles.stat}><Muted style={styles.statLabel}>{t("app.spent")}</Muted><Txt style={styles.statValue}>{formatCurrency(data.spent)}</Txt></Card>
            </View>

            <Card>
              <View style={styles.rowBetween}>
                <Heading>{t("app.budgetUsed")}</Heading>
                {data.budgetUsedPercent !== null && <Txt style={{ color: palette.ink, fontWeight: "800" }}>{Math.round(data.budgetUsedPercent)}%</Txt>}
              </View>
              {data.budgetUsedPercent === null ? (
                <Muted>{t("app.noBudget")}</Muted>
              ) : (
                <>
                  <Meter value={data.budgetUsedPercent} tone={data.budgetUsedPercent > 100 ? "danger" : "brand"} label={t("app.budgetUsed")} />
                  <Muted>{t("finance.budgetUsedOf", { spent: formatCurrency(data.spent), budget: formatCurrency(data.budgetTotal) })}</Muted>
                  {data.categories
                    .filter((c) => c.budget !== null && c.spent > c.budget)
                    .map((c) => (
                      <View key={c.categoryId} style={styles.over}>
                        <Txt style={{ color: "#7F1D1D", fontWeight: "700" }}>
                          {t("finance.overBudgetBy", { name: c.name, amount: formatCurrency(c.spent - (c.budget ?? 0)) })}
                        </Txt>
                      </View>
                    ))}
                </>
              )}
            </Card>

            <View style={styles.rowBetween}>
              <Heading>{t("app.toApprove")}</Heading>
              {data.pendingExpenseCount > 0 && <Muted>{formatCurrency(data.pendingExpenseAmount)}</Muted>}
            </View>
            {pending.isError ? (
              <Muted>{t("app.loadError")}</Muted>
            ) : !pending.data ? (
              <Skeleton height={140} />
            ) : pending.data.length === 0 ? (
              <Card><Muted>{t("app.nothingToApprove")}</Muted></Card>
            ) : (
              pending.data.map((expense) => <ExpenseCard key={expense.id} expense={expense} overview={data} />)
            )}

            {data.unpaidFees > 0 && (
              <Card style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }}>
                <Muted style={{ fontWeight: "700", color: palette.warning }}>{t("app.unpaidFees")}</Muted>
                <Txt style={styles.statValue}>{formatCurrency(data.unpaidFees)}</Txt>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  netLabel: { color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: "700" },
  net: { color: "#FFFFFF", fontSize: 34, fontWeight: "800", fontVariant: ["tabular-nums"] },
  grid: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  statLabel: { fontSize: 13, fontWeight: "700" },
  statValue: { fontSize: 19, fontWeight: "800", color: palette.ink, fontVariant: ["tabular-nums"] },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  amount: { fontSize: 18, fontWeight: "800", color: palette.ink, fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", gap: spacing.sm },
  over: { backgroundColor: palette.dangerBg, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
