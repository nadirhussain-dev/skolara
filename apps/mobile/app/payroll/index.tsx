import { useMyPayslips } from "@skolara/api-client";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/lib/theme";
import { Card, EmptyState, LoadingLine, Screen } from "@/lib/ui";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function MyPayslipsScreen() {
  const { data: payslips, isLoading } = useMyPayslips();

  return (
    <Screen>
      {isLoading && <LoadingLine label="Loading payslips..." />}
      <FlatList
        data={payslips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View>
              <Text style={styles.month}>{item.month}</Text>
              <Text style={styles.meta}>
                Basic {formatCurrency(Number(item.basicSalary))} · Deductions{" "}
                {formatCurrency(Number(item.deductions))}
              </Text>
            </View>
            <Text style={styles.net}>{formatCurrency(Number(item.netPay))}</Text>
          </Card>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState title="No payslips yet" /> : null}
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
