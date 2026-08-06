import { useBusForStudent, useMyChildren } from "@skolara/api-client";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "@/lib/theme";
import { Card, Chip, EmptyState, LoadingLine, Pill, Screen, SectionLabel } from "@/lib/ui";

export default function BusTrackingScreen() {
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
          title="Select a child"
          description="Pick a child above to see their bus and live location."
        />
      )}

      {studentId && isLoading && <LoadingLine label="Loading bus info..." />}

      {studentId && !isLoading && !busInfo && (
        <EmptyState title="No bus assigned yet" description="Check back once your school assigns a route." />
      )}

      {busInfo && (
        <Card>
          <SectionLabel>Route</SectionLabel>
          <Text style={styles.route}>{busInfo.bus.routeName}</Text>
          <Text style={styles.meta}>
            {busInfo.bus.plateNumber} · Driver {busInfo.bus.driverName}
            {busInfo.bus.driverPhone ? ` · ${busInfo.bus.driverPhone}` : ""}
          </Text>

          <View style={styles.divider} />

          <SectionLabel>Live location</SectionLabel>
          {busInfo.latestLocation ? (
            <>
              <Pill label="Live" tone="success" />
              <Text style={styles.meta}>
                {busInfo.latestLocation.latitude.toFixed(5)},{" "}
                {busInfo.latestLocation.longitude.toFixed(5)}
              </Text>
              <Text style={styles.meta}>
                Updated {new Date(busInfo.latestLocation.recordedAt).toLocaleTimeString()}
              </Text>
            </>
          ) : (
            <Text style={styles.meta}>No location reported yet.</Text>
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
