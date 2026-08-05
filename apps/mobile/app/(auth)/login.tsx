import { useLogin } from "@skolara/api-client";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { setStoredAccessToken } from "@/lib/api-client";

export default function LoginScreen() {
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subdomain, setSubdomain] = useState("");

  async function handleSubmit() {
    const result = await login.mutateAsync({
      email,
      password,
      subdomain: subdomain || undefined,
    });
    await setStoredAccessToken(result.accessToken);
    if (result.user.role === "TEACHER") {
      router.replace("/attendance");
    } else {
      router.replace("/dashboard");
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="School subdomain (optional)"
        autoCapitalize="none"
        value={subdomain}
        onChangeText={setSubdomain}
        style={styles.input}
      />
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {login.isError && <Text style={styles.error}>Invalid credentials.</Text>}
      <Pressable style={styles.button} onPress={handleSubmit} disabled={login.isPending}>
        {login.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: "#3730A3",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#DC2626", fontSize: 13 },
});
