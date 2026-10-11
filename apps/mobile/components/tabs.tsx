import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "@skolara/api-client";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, useTheme } from "@/lib/school-theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

export interface TabSpec {
  name: string;
  title: string;
  icon: IconName;
  /** Shows the unread notification count on this tab. */
  inbox?: boolean;
}

/** The bottom tab bar shared by every role, in the school's colour. */
export function RoleTabs({ tabs }: { tabs: TabSpec[] }) {
  const { brand, isRTL } = useTheme();
  const inbox = useNotifications({ refetchInterval: 60_000 });
  const unread = inbox.data?.unreadCount ?? 0;
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand[700],
        tabBarInactiveTintColor: palette.muted,
        // The navigator gives each item a fixed 49pt box, so icon and label are
        // sized to fit inside it without the label being clipped.
        // Urdu script is taller than Latin, so it gets a taller line and a smaller icon.
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", lineHeight: isRTL ? 19 : 14 },
        tabBarIconStyle: isRTL ? { height: 20 } : undefined,
        // Sized by hand so the labels are never clipped, with room for the
        // home indicator on phones that have one.
        tabBarStyle: {
          borderTopColor: palette.line,
          backgroundColor: palette.surface,
          height: 60 + insets.bottom,
          paddingTop: 4,
          paddingBottom: 6 + insets.bottom,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? tab.icon : (`${tab.icon}-outline` as IconName)} size={isRTL ? 18 : 22} color={color} />
            ),
            tabBarBadge: tab.inbox && unread > 0 ? (unread > 9 ? "9+" : unread) : undefined,
            tabBarBadgeStyle: { backgroundColor: palette.accent, color: palette.accentInk, fontWeight: "800" },
          }}
        />
      ))}
    </Tabs>
  );
}
