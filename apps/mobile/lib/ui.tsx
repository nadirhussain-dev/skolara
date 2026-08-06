/**
 * Small set of shared, theme-aware primitives used across mobile screens so
 * every screen shares the same spacing, radii, and color language as the web
 * dashboard (@skolara/ui).
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { colors, radius, shadow, spacing, tones, typography, type Tone } from "./theme";

export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: ViewProps & { children: ReactNode }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyDescription}>{description}</Text>}
    </View>
  );
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const buttonVariants: Record<
  "primary" | "secondary" | "accent" | "ghost",
  { bg: string; fg: string; borderColor?: string }
> = {
  primary: { bg: colors.brand[700], fg: colors.white },
  secondary: { bg: colors.white, fg: colors.brand[700], borderColor: colors.brand[300] },
  accent: { bg: colors.accent[500], fg: colors.white },
  ghost: { bg: "transparent", fg: colors.brand[700] },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: keyof typeof buttonVariants;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const v = buttonVariants[variant];
  const isDisabled = disabled || loading;
  const glow =
    variant === "primary" || variant === "accent"
      ? {
          shadowColor: v.bg,
          shadowOpacity: 0.32,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 4,
        }
      : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        glow,
        {
          backgroundColor: v.bg,
          borderColor: v.borderColor ?? "transparent",
          borderWidth: v.borderColor ? 1 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.slate[400]}
      {...props}
      style={[styles.input, props.multiline && styles.textarea, props.style]}
    />
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={active ? styles.chipTextActive : styles.chipText}>{label}</Text>
    </Pressable>
  );
}

export function ListRow({ children, style }: ViewProps & { children: ReactNode }) {
  return <View style={[styles.listRow, style]}>{children}</View>;
}

export function LoadingLine({ label = "Loading..." }: { label?: string }) {
  return <Text style={styles.loading}>{label}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate[50], padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.slate[100],
    gap: spacing.sm,
    ...shadow.card,
  },
  sectionLabel: { ...typography.label, marginBottom: spacing.xs },
  emptyState: { paddingVertical: spacing.xl, alignItems: "center", gap: spacing.xs },
  emptyTitle: { ...typography.subheading, textAlign: "center" },
  emptyDescription: { ...typography.muted, textAlign: "center" },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: 12, fontWeight: "700" },
  button: {
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontWeight: "700", fontSize: 15 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.slate[900],
    backgroundColor: colors.white,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  chip: {
    borderWidth: 1,
    borderColor: colors.brand[300],
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.brand[700], borderColor: colors.brand[700] },
  chipText: { color: colors.brand[700], fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: colors.white, fontWeight: "600", fontSize: 13 },
  listRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    gap: 4,
  },
  loading: { ...typography.muted, paddingVertical: spacing.sm },
});
