import { useBusForStudent, useMyChildren } from "@skolara/api-client";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { colors, spacing, typography } from "@/lib/theme";
import { intlLocale } from "@/lib/intl";
import { Card, Chip, EmptyState, LoadingLine, Pill, Screen, SectionLabel } from "@/lib/ui";

export default function BusTrackingScreen() {
  const { t, locale } = useTranslation();
  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const { data: busInfo, isLoading } = useBusForStudent(studentId);

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
          description={t("mobileFamily.selectChildBus")}
        />
      )}

      {studentId && isLoading && <LoadingLine label={t("common.loading")} />}

      {studentId && !isLoading && !busInfo && (
        <EmptyState
          title={t("mobileFamily.noBusAssigned")}
          description={t("mobileFamily.noBusAssignedBody")}
        />
      )}

      {busInfo && (
        <Card>
          <SectionLabel>{t("mobileFamily.route")}</SectionLabel>
          <Text style={styles.route}>{busInfo.bus.routeName}</Text>
          <Text style={styles.meta}>
            {t("mobileFamily.busMeta", {
              plate: busInfo.bus.plateNumber,
              driver: busInfo.bus.driverName,
            })}
            {busInfo.bus.driverPhone ? ` · ${busInfo.bus.driverPhone}` : ""}
          </Text>

          <View style={styles.divider} />

          <SectionLabel>{t("mobileFamily.liveLocation")}</SectionLabel>
          {busInfo.latestLocation ? (
            <>
              <Pill label={t("mobileFamily.live")} tone="success" />
              <Text style={styles.meta}>
                {busInfo.latestLocation.latitude.toFixed(5)},{" "}
                {busInfo.latestLocation.longitude.toFixed(5)}
              </Text>
              <Text style={styles.meta}>
                {t("mobileFamily.updatedAt", {
                  time: new Date(busInfo.latestLocation.recordedAt).toLocaleTimeString(
                    intlLocale(locale),
                  ),
                })}
              </Text>
            </>
          ) : (
            <Text style={styles.meta}>{t("transport.noLocation")}</Text>
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  route: { ...typography.heading },
  meta: { ...typography.muted, color: colors.slate[500] },
  divider: { height: 1, backgroundColor: colors.slate[200], marginVertical: spacing.xs },
});
