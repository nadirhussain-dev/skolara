import { ScrollView, StyleSheet, View } from "react-native";
import { useChild } from "@/lib/child-context";
import { spacing } from "@/lib/theme";
import { Chip } from "@/lib/ui";

/** Chips for switching between children. Renders nothing for a single child. */
export function ChildSwitcher() {
  const { children, child, select } = useChild();
  if (children.length < 2) return null;
  return (
    <View style={styles.plate}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {children.map((entry) => (
          <Chip key={entry.id} label={entry.user.firstName} active={entry.id === child?.id} onPress={() => select(entry.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // A white plate so the chips stay readable on the coloured header.
  plate: { marginTop: spacing.md, backgroundColor: "#FFFFFF", borderRadius: 999, padding: 4, alignSelf: "flex-start", maxWidth: "100%" },
});
