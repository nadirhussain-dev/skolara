import { useMyPayslips } from "@skolara/api-client";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation, type Locale } from "@skolara/i18n";
import { colors, spacing, typography } from "@/lib/theme";
import { intlLocale } from "@/lib/intl";
import { Card, EmptyState, LoadingLine, Screen } from "@/lib/ui";

function formatCurrency(amount: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function MyPayslipsScreen() {
  const { t, locale } = useTranslation();
  const { data: payslips, isLoading } = useMyPayslips();

  return (
    <Screen>
      {isLoading && <LoadingLine label={t("common.loading")} />}
      <FlatList
        data={payslips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View>
              <Text style={styles.month}>{item.month}</Text>
              <Text style={styles.meta}>
                {t("payroll.payslipSummary", {
                  basic: formatCurrency(Number(item.basicSalary), locale),
                  deductions: formatCurrency(Number(item.deductions), locale),
                })}
              </Text>
            </View>
            <Text style={styles.net}>{formatCurrency(Number(item.netPay), locale)}</Text>
          </Card>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState title={t("payroll.noPayslips")} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  month: { ...typography.subheading },
  meta: { ...typography.muted, color: colors.slate[500] },
  net: { fontSize: 18, fontWeight: "800", color: colors.brand[700] },
});
