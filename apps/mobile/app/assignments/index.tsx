import { useApiClient } from "@skolara/api-client";
import type { SchoolClass } from "@skolara/types";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { spacing, typography } from "@/lib/theme";
import { Card, EmptyState, LoadingLine, Screen } from "@/lib/ui";

export default function SelectClassForAssignmentsScreen() {
  const { t } = useTranslation();
  const api = useApiClient();
  const { data: classes, isLoading } = useQuery<SchoolClass[]>({
    queryKey: ["classes"],
    queryFn: () => api.classes.list(),
  });

  return (
    <Screen>
      {isLoading && <LoadingLine label={t("common.loading")} />}
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Link href={`/assignments/${item.id}`} asChild>
            <Pressable>
              <Card>
                <Text style={styles.row}>
                  {item.name} — {item.section}
                </Text>
              </Card>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState title={t("mobileLists.noClassesAssigned")} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { ...typography.subheading },
});
