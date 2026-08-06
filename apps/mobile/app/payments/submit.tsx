import { useInvoicesForStudent, useMyChildren, useSubmitPayment } from "@skolara/api-client";
import type { PaymentSubmission } from "@skolara/types";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { Button, Card, Chip, Input, SectionLabel } from "@/lib/ui";

export default function SubmitPaymentScreen() {
  const { data: children } = useMyChildren();
  const [studentId, setStudentId] = useState<string>();
  const { data: invoices } = useInvoicesForStudent(studentId);
  const [invoiceId, setInvoiceId] = useState<string>();
  const [amount, setAmount] = useState("");
  const [screenshotUri, setScreenshotUri] = useState<string>();
  const submitPayment = useSubmitPayment();
  const [result, setResult] = useState<PaymentSubmission | null>(null);

  async function pickScreenshot() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!picked.canceled) setScreenshotUri(picked.assets[0].uri);
  }

  async function submit() {
    if (!studentId || !invoiceId || !screenshotUri) {
      Alert.alert("Missing info", "Select a child, an invoice, and a screenshot.");
      return;
    }
    // Local file URI stands in until image upload to storage is wired up (Phase 2).
    const response = await submitPayment.mutateAsync({
      studentId,
      input: {
        invoiceId,
        amountClaimed: Number(amount),
        screenshotUrl: screenshotUri,
      },
    });
    setResult(response);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <SectionLabel>Child</SectionLabel>
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

        <SectionLabel>Invoice</SectionLabel>
        <View style={styles.chipRow}>
          {invoices?.map((invoice) => (
            <Chip
              key={invoice.id}
              label={invoice.term}
              active={invoiceId === invoice.id}
              onPress={() => setInvoiceId(invoice.id)}
            />
          ))}
        </View>

        <SectionLabel>Amount paid</SectionLabel>
        <Input keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="0" />

        <Button
          title={screenshotUri ? "Change screenshot" : "Upload transfer screenshot"}
          variant="secondary"
          onPress={pickScreenshot}
        />
        {screenshotUri && <Image source={{ uri: screenshotUri }} style={styles.preview} />}

        <Button
          title="Submit payment"
          variant="accent"
          onPress={submit}
          loading={submitPayment.isPending}
          style={styles.submitButton}
        />
      </Card>

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>Reference: {result.referenceId}</Text>
          <Text style={styles.resultText}>Status: Pending verification</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.slate[50] },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  preview: { width: "100%", height: 180, borderRadius: radius.md },
  submitButton: { marginTop: spacing.xs },
  resultBox: { padding: spacing.md, backgroundColor: colors.brand[50], borderRadius: radius.md },
  resultText: { ...typography.body, color: colors.brand[700] },
});
