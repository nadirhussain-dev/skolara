import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Providers } from "@/lib/providers";

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerTintColor: "#3730A3" }}>
        <Stack.Screen name="index" options={{ title: "Skolara" }} />
        <Stack.Screen name="(auth)/login" options={{ title: "Sign in" }} />
        <Stack.Screen
          name="attendance/[classId]"
          options={{ title: "Mark attendance" }}
        />
        <Stack.Screen name="payments/submit" options={{ title: "Submit payment" }} />
        <Stack.Screen name="dashboard" options={{ title: "Skolara" }} />
        <Stack.Screen name="results/index" options={{ title: "Results" }} />
        <Stack.Screen name="notices/index" options={{ title: "Notices" }} />
      </Stack>
    </Providers>
  );
}
