import { useLoansForStudent, useMyChildren } from "@skolara/api-client";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { colors, spacing, typography } from "@/lib/theme";
import { intlLocale } from "@/lib/intl";
import { Card, Chip, EmptyState, LoadingLine, Pill, Screen } from "@/lib/ui";

export default function LibraryStatusScreen() {
  const { t, locale } = useTranslation();
  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const { data: loans, isLoading } = useLoansForStudent(studentId);

  return (
    <Screen>
      <View style={styles.chipRow}>
        {children?.map((child) => (
          <Chip
            key={child.id}
            label={child.user.firstName}
            active={studentId === child.id}
            onPress={() => setStudentId(child.id)}
          />
        ))}
      </View>

      {!studentId && (
        <EmptyState
          title={t("mobileFamily.selectChild")}
          description={t("mobileFamily.selectChildBooks")}
        />
      )}

      {studentId && isLoading && <LoadingLine label={t("common.loading")} />}

      <FlatList
        data={loans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => {
          const overdue = !item.returnedAt && new Date(item.dueAt) < new Date();
          return (
            <Card style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.book.title}</Text>
                <Text style={styles.meta}>{item.book.author}</Text>
                <Text style={styles.meta}>
                  {t("mobileFamily.dueOn", {
                    date: new Date(item.dueAt).toLocaleDateString(
                      intlLocale(locale),
                    ),
                  })}
                </Text>
              </View>
              {item.returnedAt ? (
                <Pill label={t("mobileFamily.returned")} tone="success" />
              ) : overdue ? (
                <Pill label={t("mobileFamily.overdue")} tone="danger" />
              ) : (
                <Pill label={t("mobileFamily.borrowed")} tone="brand" />
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          studentId && !isLoading ? <EmptyState title={t("mobileFamily.noBorrowedBooks")} /> : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { ...typography.subheading },
  meta: { ...typography.muted, color: colors.slate[500] },
});
