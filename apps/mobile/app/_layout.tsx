import { useTranslation } from "@skolara/i18n";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Providers } from "@/lib/providers";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="auto" />
      <RootStack />
    </Providers>
  );
}

/**
 * Split out of `RootLayout` because header titles need the translator, and
 * `RootLayout` is what renders the provider — it sits above the context it
 * would be reading.
 */
function RootStack() {
  const { t } = useTranslation();

  return (
    <Stack
        screenOptions={{
          headerTintColor: colors.brand[700],
          headerTitleStyle: { color: colors.slate[900] },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Skolara" }} />
        <Stack.Screen name="(auth)/login" options={{ title: t("screens.signIn") }} />
        <Stack.Screen name="(auth)/forgot-password" options={{ title: t("screens.forgotPassword") }} />
        <Stack.Screen
          name="attendance/[classId]"
          options={{ title: t("attendance.markAttendance") }}
        />
        <Stack.Screen name="payments/submit" options={{ title: t("screens.submitPayment") }} />
        <Stack.Screen name="dashboard" options={{ title: "Skolara" }} />
        <Stack.Screen name="teacher-dashboard" options={{ title: "Skolara" }} />
        <Stack.Screen name="super-admin/index" options={{ title: "Skolara" }} />
        <Stack.Screen name="results/index" options={{ title: t("results.title") }} />
        <Stack.Screen name="notices/index" options={{ title: t("nav.notices") }} />
        <Stack.Screen name="assignments/index" options={{ title: t("screens.selectClass") }} />
        <Stack.Screen name="assignments/[classId]" options={{ title: t("nav.assignments") }} />
        <Stack.Screen
          name="assignments/submissions/[assignmentId]"
          options={{ title: t("screens.submissions") }}
        />
        <Stack.Screen name="assignments/mine" options={{ title: t("dashboard.homework") }} />
        <Stack.Screen name="complaints/index" options={{ title: t("nav.complaints") }} />
        <Stack.Screen name="complaints/[id]" options={{ title: t("screens.complaint") }} />
        <Stack.Screen name="messages/index" options={{ title: t("dashboard.messages") }} />
        <Stack.Screen name="messages/[threadId]" options={{ title: t("screens.conversation") }} />
        <Stack.Screen name="transport/index" options={{ title: t("dashboard.busTracking") }} />
        <Stack.Screen name="library/index" options={{ title: t("nav.library") }} />
        <Stack.Screen name="payroll/index" options={{ title: t("dashboard.myPayslips") }} />
        <Stack.Screen name="timetable/index" options={{ title: t("nav.timetable") }} />
        <Stack.Screen name="calendar/index" options={{ title: t("nav.calendar") }} />
        <Stack.Screen name="leave/index" options={{ title: t("nav.leave") }} />
        <Stack.Screen name="absences/index" options={{ title: t("screens.reportAbsence") }} />
        <Stack.Screen name="meetings/index" options={{ title: t("nav.meetings") }} />
        <Stack.Screen name="materials/index" options={{ title: t("nav.studyMaterials") }} />
        <Stack.Screen name="quizzes/index" options={{ title: t("nav.quizzes") }} />
        <Stack.Screen name="quizzes/[quizId]" options={{ title: t("screens.quiz") }} />
        <Stack.Screen name="live-classes/index" options={{ title: t("nav.liveClasses") }} />
        <Stack.Screen name="performance/index" options={{ title: t("dashboard.performance") }} />
    </Stack>
  );
}
