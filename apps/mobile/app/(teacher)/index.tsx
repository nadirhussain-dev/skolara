import { useApiClient, useClasses } from "@skolara/api-client";
import { useTranslation } from "@skolara/i18n";
import { useQueries } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { readProfile } from "@/lib/auth";
import { formatDay, todayKey } from "@/lib/dates";
import { palette, useTheme } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { BrandHeader, Card, EmptyState, ErrorState, Heading, Muted, RowLink, Skeleton } from "@/lib/ui";

/**
 * A teacher's first screen answers one question: which of my registers are
 * still to do today? Each class opens its register.
 */
export default function TeacherHome() {
  const { t, locale } = useTranslation();
  const { school } = useTheme();
  const api = useApiClient();
  // The API returns only the classes this teacher is assigned to.
  const classes = useClasses();
  const today = todayKey();
  const registers = useQueries({
    queries: (classes.data ?? []).map((c) => ({
      queryKey: ["attendance", "class", c.id, today],
      queryFn: () => api.attendance.byClass(c.id, today),
    })),
  });
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    let active = true;
    void readProfile().then((profile) => {
      if (active && profile) setFirstName(profile.firstName);
    });
    return () => {
      active = false;
    };
  }, []);

  const refreshing = classes.isRefetching || registers.some((r) => r.isRefetching);
  const refresh = () => {
    void classes.refetch();
    for (const r of registers) void r.refetch();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.page }} edges={["left", "right"]}>
      <BrandHeader
        title={firstName ? t("app.hello", { name: firstName }) : t("app.tabHome")}
        subtitle={[school?.name, formatDay(new Date(`${today}T00:00:00.000Z`), locale)].filter(Boolean).join(" · ")}
      />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View>
          <Heading>{t("app.registers")}</Heading>
          <Muted>{t("app.registersBody")}</Muted>
        </View>
        {classes.isError ? (
          <ErrorState message={t("app.loadError")} retryLabel={t("app.retry")} onRetry={() => void classes.refetch()} />
        ) : !classes.data ? (
          <><Skeleton /><Skeleton /><Skeleton /></>
        ) : classes.data.length === 0 ? (
          <Card><EmptyState title={t("app.noClasses")} description={t("app.noClassesBody")} /></Card>
        ) : (
          <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
            {classes.data.map((c, index) => {
              const records = registers[index]?.data;
              const taken = records !== undefined && records.length > 0;
              const present = (records ?? []).filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
              return (
                <View key={c.id} style={index > 0 ? styles.divider : undefined}>
                  <RowLink
                    icon={taken ? "checkmark-circle" : "ellipse-outline"}
                    tone={records !== undefined && !taken ? "danger" : "brand"}
                    title={`${c.name}-${c.section}`}
                    subtitle={
                      records === undefined
                        ? t("common.loading")
                        : taken
                          ? t("app.taken", { present, total: records.length })
                          : t("app.notTaken")
                    }
                    onPress={() => router.push(`/attendance/${c.id}`)}
                  />
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  divider: { borderTopWidth: 1, borderTopColor: palette.line },
});
