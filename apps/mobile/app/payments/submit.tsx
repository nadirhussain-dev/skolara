import {
  useInvoicesForStudent,
  useMyChildren,
  useSubmitPayment,
} from "@skolara/api-client";
import type { PaymentSubmission } from "@skolara/types";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
      <Text style={styles.label}>Child</Text>
      <View style={styles.chipRow}>
        {children?.map((child) => (
          <Pressable
            key={child.id}
            onPress={() => setStudentId(child.id)}
            style={[styles.chip, studentId === child.id && styles.chipActive]}
          >
            <Text
              style={
                studentId === child.id ? styles.chipTextActive : styles.chipText
              }
            >
              {child.user.firstName}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Invoice</Text>
      <View style={styles.chipRow}>
        {invoices?.map((invoice) => (
          <Pressable
            key={invoice.id}
            onPress={() => setInvoiceId(invoice.id)}
            style={[styles.chip, invoiceId === invoice.id && styles.chipActive]}
          >
            <Text
              style={
                invoiceId === invoice.id ? styles.chipTextActive : styles.chipText
              }
            >
              {invoice.term}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Amount paid</Text>
      <TextInput
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={styles.input}
        placeholder="0"
      />

      <Pressable style={styles.secondaryButton} onPress={pickScreenshot}>
        <Text style={styles.secondaryButtonText}>
          {screenshotUri ? "Change screenshot" : "Upload transfer screenshot"}
        </Text>
      </Pressable>
      {screenshotUri && (
        <Image source={{ uri: screenshotUri }} style={styles.preview} />
      )}

      <Pressable style={styles.button} onPress={submit} disabled={submitPayment.isPending}>
        <Text style={styles.buttonText}>
          {submitPayment.isPending ? "Submitting..." : "Submit payment"}
        </Text>
      </Pressable>

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
  container: { padding: 16, gap: 8 },
  label: { fontWeight: "600", marginTop: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#3730A3",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: "#3730A3" },
  chipText: { color: "#3730A3" },
  chipTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#3730A3",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: { color: "#3730A3", fontWeight: "600" },
  preview: { width: "100%", height: 180, borderRadius: 8, marginTop: 8 },
  button: {
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  resultBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#EEF0FC",
    borderRadius: 8,
  },
  resultText: { color: "#3730A3" },
});
