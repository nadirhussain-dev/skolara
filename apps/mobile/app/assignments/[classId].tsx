import { useClassAssignments, useCreateAssignment } from "@skolara/api-client";
import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@skolara/i18n";
import { colors, spacing, typography } from "@/lib/theme";
import { intlLocale } from "@/lib/intl";
import { Button, Card, EmptyState, Input, LoadingLine, Screen, SectionLabel } from "@/lib/ui";

export default function ClassAssignmentsScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { t, locale } = useTranslation();
  const { data: assignments, isLoading } = useClassAssignments(classId);
  const createAssignment = useCreateAssignment();

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function submit() {
    if (!subject || !title || !dueDate) return;
    await createAssignment.mutateAsync({
      classId,
      subject,
      title,
      dueDate: new Date(dueDate),
    });
    setSubject("");
    setTitle("");
    setDueDate("");
  }

  return (
    <Screen>
      <Card>
        <SectionLabel>{t("assignments.assignHomework")}</SectionLabel>
        <Input placeholder={t("fields.subject")} value={subject} onChangeText={setSubject} />
        <Input placeholder={t("fields.title")} value={title} onChangeText={setTitle} />
        <Input
          placeholder={t("mobileAssignments.dueDateHint")}
          value={dueDate}
          onChangeText={setDueDate}
        />
        <Button
          title={t("mobileAssignments.assign")}
          onPress={submit}
          loading={createAssignment.isPending}
        />
      </Card>

      {isLoading && <LoadingLine label={t("common.loading")} />}
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <Link href={`/assignments/submissions/${item.id}`} asChild>
            <Pressable>
              <Card>
                <View style={styles.row}>
                  <Text style={styles.title}>
                    {item.title} ({item.subject})
                  </Text>
                  <Text style={styles.due}>
                    {t("mobileAssignments.dueOn", {
                      date: new Date(item.dueDate).toLocaleDateString(intlLocale(locale)),
                    })}
                  </Text>
                </View>
              </Card>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={!isLoading ? <EmptyState title={t("mobileAssignments.noAssignments")} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: 2 },
  title: { ...typography.subheading },
  due: { ...typography.muted, color: colors.slate[500] },
});
