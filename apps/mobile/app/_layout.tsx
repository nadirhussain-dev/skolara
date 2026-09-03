import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Providers } from "@/lib/providers";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerTintColor: colors.brand[700],
          headerTitleStyle: { color: colors.slate[900] },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Skolara" }} />
        <Stack.Screen name="(auth)/login" options={{ title: "Sign in" }} />
        <Stack.Screen name="(auth)/forgot-password" options={{ title: "Forgot password" }} />
        <Stack.Screen
          name="attendance/[classId]"
          options={{ title: "Mark attendance" }}
        />
        <Stack.Screen name="payments/submit" options={{ title: "Submit payment" }} />
        <Stack.Screen name="dashboard" options={{ title: "Skolara" }} />
        <Stack.Screen name="teacher-dashboard" options={{ title: "Skolara" }} />
        <Stack.Screen name="results/index" options={{ title: "Results" }} />
        <Stack.Screen name="notices/index" options={{ title: "Notices" }} />
        <Stack.Screen name="assignments/index" options={{ title: "Select class" }} />
        <Stack.Screen name="assignments/[classId]" options={{ title: "Assignments" }} />
        <Stack.Screen
          name="assignments/submissions/[assignmentId]"
          options={{ title: "Submissions" }}
        />
        <Stack.Screen name="assignments/mine" options={{ title: "Homework" }} />
        <Stack.Screen name="complaints/index" options={{ title: "Complaints" }} />
        <Stack.Screen name="complaints/[id]" options={{ title: "Complaint" }} />
        <Stack.Screen name="messages/index" options={{ title: "Messages" }} />
        <Stack.Screen name="messages/[threadId]" options={{ title: "Conversation" }} />
        <Stack.Screen name="transport/index" options={{ title: "Bus tracking" }} />
        <Stack.Screen name="library/index" options={{ title: "Library" }} />
        <Stack.Screen name="payroll/index" options={{ title: "My payslips" }} />
        <Stack.Screen name="timetable/index" options={{ title: "Timetable" }} />
        <Stack.Screen name="calendar/index" options={{ title: "Calendar" }} />
        <Stack.Screen name="leave/index" options={{ title: "Leave" }} />
        <Stack.Screen name="meetings/index" options={{ title: "Meetings" }} />
        <Stack.Screen name="materials/index" options={{ title: "Study materials" }} />
        <Stack.Screen name="quizzes/index" options={{ title: "Quizzes" }} />
        <Stack.Screen name="quizzes/[quizId]" options={{ title: "Quiz" }} />
        <Stack.Screen name="live-classes/index" options={{ title: "Online classes" }} />
      </Stack>
    </Providers>
  );
}
