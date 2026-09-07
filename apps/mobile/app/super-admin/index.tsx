import {
  useApproveSchool,
  usePlatformAnalytics,
  useRejectSchool,
  useSchools,
} from "@skolara/api-client";
import type { SubscriptionStatus } from "@skolara/types";
import { useTranslation, type Locale } from "@skolara/i18n";
import { router } from "expo-router";
import { useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  apiClient,
  clearSession,
  getStoredPushToken,
  getStoredRefreshToken,
} from "@/lib/api-client";
import { LanguageToggle } from "@/lib/language-toggle";
import { unregisterPushToken } from "@/lib/push";
import { colors, spacing, typography, type Tone } from "@/lib/theme";
import { intlLocale } from "@/lib/intl";
import { Button, Card, EmptyState, LoadingLine, Pill, Screen, SectionLabel } from "@/lib/ui";

const STATUS_TONE: Record<SubscriptionStatus, Tone> = {
  PENDING: "warning",
  TRIAL: "brand",
  ACTIVE: "success",
  EXPIRED: "warning",
  SUSPENDED: "danger",
  REJECTED: "danger",
};

/**
 * Compact rupees — a phone header has no room for "Rs. 1,240,000".
 *
 * Intl's "compact" notation is locale-aware, so Urdu gets its own
 * abbreviations rather than an English "M" bolted onto Urdu digits.
 */
function compactPkr(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "PKR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export default function SuperAdminScreen() {
  const { t, locale } = useTranslation();
  const { data: analytics, isLoading: analyticsLoading } = usePlatformAnalytics();
  const { data: schools, isLoading: schoolsLoading } = useSchools();
  const approve = useApproveSchool();
  const reject = useRejectSchool();

  // The whole point of this screen: the queue that holds up a school going
  // live. Everything else here is a number to glance at.
  const pending = useMemo(
    () => (schools ?? []).filter((school) => school.subscriptionStatus === "PENDING"),
    [schools],
  );

  function confirmReject(id: string, name: string) {
    // Rejecting is the one destructive action on this screen, and a phone is
    // exactly where a mis-tap happens.
    Alert.alert(t("schoolsAdmin.reject"), name, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("schoolsAdmin.reject"),
        style: "destructive",
        onPress: () => reject.mutate(id),
      },
    ]);
  }

  async function signOut() {
    const refreshToken = await getStoredRefreshToken();
    const pushToken = await getStoredPushToken();
    await unregisterPushToken(pushToken);
    await clearSession();
    router.replace("/(auth)/login");
    if (refreshToken) apiClient.auth.logout(refreshToken).catch(() => {});
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <SectionLabel>{t("platformAnalytics.title")}</SectionLabel>
        {analyticsLoading && <LoadingLine />}
        {analytics && (
          <View style={styles.statRow}>
            <Card style={styles.stat}>
              <Text style={styles.statValue}>{compactPkr(analytics.mrrPkr, locale)}</Text>
              <Text style={styles.statLabel}>{t("platformAnalytics.mrr")}</Text>
            </Card>
            <Card style={styles.stat}>
              <Text style={styles.statValue}>{compactPkr(analytics.arrPkr, locale)}</Text>
              <Text style={styles.statLabel}>{t("platformAnalytics.arr")}</Text>
            </Card>
            <Card style={styles.stat}>
              <Text style={styles.statValue}>{analytics.totalSchools}</Text>
              <Text style={styles.statLabel}>{t("platformAnalytics.totalSchools")}</Text>
            </Card>
            <Card style={styles.stat}>
              <Text style={styles.statValue}>{analytics.trialsEndingSoon}</Text>
              <Text style={styles.statLabel}>{t("platformAnalytics.trialsEnding")}</Text>
            </Card>
          </View>
        )}

        <SectionLabel>{t("platformAnalytics.awaitingApproval")}</SectionLabel>
        {schoolsLoading && <LoadingLine />}
        {!schoolsLoading && pending.length === 0 && (
          <EmptyState title={t("platformAnalytics.allClear")} />
        )}
        {pending.map((school) => (
          <Card key={school.id} style={styles.school}>
            <View style={styles.schoolHead}>
              <Text style={styles.schoolName}>{school.name}</Text>
              <Pill
                label={t(`subscriptionStatus.${school.subscriptionStatus}`)}
                tone={STATUS_TONE[school.subscriptionStatus]}
              />
            </View>
            <Text style={styles.schoolMeta}>
              {t("schoolsAdmin.schoolLine", {
                subdomain: school.subdomain,
                plan: t(`plans.${school.plan}`),
              })}
            </Text>
            <View style={styles.actions}>
              <Button
                title={t("schoolsAdmin.approve")}
                onPress={() => approve.mutate(school.id)}
                loading={approve.isPending}
                style={styles.action}
              />
              <Button
                title={t("schoolsAdmin.reject")}
                variant="ghost"
                onPress={() => confirmReject(school.id, school.name)}
              />
            </View>
          </Card>
        ))}

        {/* Deliberately no school list beyond the queue and no editing. The
            proposal calls this companion optional, and what it is for is the
            two things a platform owner does away from a desk: let a school in,
            and check the revenue is still moving. */}
        <View style={styles.footer}>
          <LanguageToggle />
          <Button title={t("auth.signOut")} variant="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, paddingBottom: spacing.xl },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stat: { flexGrow: 1, minWidth: 140, alignItems: "center", gap: 2 },
  statValue: { ...typography.title, fontSize: 20, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 12, color: colors.slate[500], textAlign: "center" },
  school: { gap: 4 },
  schoolHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  schoolName: { ...typography.subheading, flex: 1 },
  schoolMeta: { fontSize: 13, color: colors.slate[500] },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  action: { flexGrow: 1 },
  footer: { alignItems: "center", marginTop: spacing.sm },
});
