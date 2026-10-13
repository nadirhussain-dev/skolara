import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { homeRouteFor } from "@/lib/auth";
import { palette, useTheme } from "@/lib/school-theme";
import { useSession } from "@/lib/session";

/**
 * The first screen. Decides where to go from what is stored on the phone:
 * signed in goes to that role's home, a remembered school goes to sign-in,
 * a new phone starts by asking for the school code.
 */
export default function Boot() {
  const session = useSession();
  const { school, isLoaded, brand } = useTheme();

  if (!session.isLoaded || !isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.surface }}>
        <ActivityIndicator color={brand[700]} accessibilityLabel="Loading" />
      </View>
    );
  }
  if (session.role) return <Redirect href={homeRouteFor(session.role)} />;
  return <Redirect href={school ? "/(auth)/login" : "/(auth)/school"} />;
}
