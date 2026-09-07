import { useNotices } from "@skolara/api-client";
import { FlatList, StyleSheet, Text } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { spacing, typography } from "@/lib/theme";
import { Card, EmptyState, LoadingLine, Screen } from "@/lib/ui";

export default function NoticesScreen() {
  const { t } = useTranslation();
  const { data: notices, isLoading } = useNotices();

  return (
    <Screen>
      {isLoading && <LoadingLine label={t("common.loading")} />}
      <FlatList
        data={notices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </Card>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState title={t("mobileLists.noNotices")} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.subheading },
  body: { ...typography.body },
});
