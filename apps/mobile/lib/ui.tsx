/**
 * Shared primitives for every mobile screen. Anything brand-coloured reads
 * the school's colour from `useTheme`, so a screen built from these follows
 * the school without knowing about it. Touch targets are at least 44pt.
 */
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, useTheme } from "./school-theme";
import { radius, shadow, spacing } from "./theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

/** Text that lines up with the reading direction of the app language. */
export function Txt({ style, ...props }: TextProps) {
  const { isRTL } = useTheme();
  return <Text {...props} style={[{ color: palette.body, fontSize: 15, textAlign: isRTL ? "right" : "left" }, style]} />;
}

export function Title({ children }: { children: ReactNode }) {
  return <Txt accessibilityRole="header" style={styles.title}>{children}</Txt>;
}

export function Heading({ children }: { children: ReactNode }) {
  return <Txt accessibilityRole="header" style={styles.heading}>{children}</Txt>;
}

export function Muted({ children, style }: { children: ReactNode; style?: TextProps["style"] }) {
  return <Txt style={[styles.muted, style]}>{children}</Txt>;
}

/** A plain padded screen. Kept for the older list screens. */
export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

/** A scrolling screen that keeps clear of the notch and home indicator. */
export function ScreenScroll({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  /** Rendered above the scroll area, edge to edge, e.g. a coloured header. */
  header?: ReactNode;
  /** Pinned under the scroll area, e.g. a primary button. */
  footer?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={header ? ["left", "right"] : ["top", "left", "right"]}>
      {header}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer && <View style={styles.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

/** The coloured band at the top of a tab's first screen. */
export function BrandHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  const { brand } = useTheme();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ backgroundColor: brand[700] }}>
      <View style={styles.brandHeader}>
        <Txt accessibilityRole="header" style={styles.brandTitle}>{title}</Txt>
        {subtitle ? <Txt style={styles.brandSubtitle}>{subtitle}</Txt> : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

export function Card({ children, style, ...props }: ViewProps & { children: ReactNode }) {
  return <View {...props} style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Txt style={styles.sectionLabel}>{children}</Txt>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.emptyState}>
      <Txt style={styles.emptyTitle}>{title}</Txt>
      {description ? <Txt style={styles.emptyDescription}>{description}</Txt> : null}
    </View>
  );
}

/** Something failed to load: say so and offer another go. */
export function ErrorState({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <Card accessibilityRole="alert">
      <Txt style={{ color: palette.danger, fontWeight: "700" }}>{message}</Txt>
      <Button title={retryLabel} variant="secondary" onPress={onRetry} />
    </Card>
  );
}

function useTones(): Record<Tone, { fg: string; bg: string }> {
  const { brand } = useTheme();
  return {
    neutral: { fg: palette.body, bg: "#F1F5F9" },
    brand: { fg: brand[800], bg: brand[50] },
    success: { fg: palette.success, bg: palette.successBg },
    warning: { fg: palette.warning, bg: palette.warningBg },
    danger: { fg: palette.danger, bg: palette.dangerBg },
  };
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const t = useTones()[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "accent" | "ghost" | "success" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: IconName;
}) {
  const { brand } = useTheme();
  const variants = {
    primary: { bg: brand[700], fg: "#FFFFFF", border: undefined },
    secondary: { bg: "#FFFFFF", fg: brand[700], border: brand[300] },
    // Dark label: white on amber fails contrast.
    accent: { bg: palette.accent, fg: palette.accentInk, border: undefined },
    ghost: { bg: "transparent", fg: brand[700], border: undefined },
    success: { bg: "#15803D", fg: "#FFFFFF", border: undefined },
    danger: { bg: "#FFFFFF", fg: palette.danger, border: "#FECACA" },
  } as const;
  const v = variants[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? "transparent",
          borderWidth: v.border ? 1 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={v.fg} /> : null}
          <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const { isRTL } = useTheme();
  return (
    <TextInput
      placeholderTextColor="#64748B"
      {...props}
      style={[styles.input, { textAlign: isRTL ? "right" : "left" }, props.multiline && styles.textarea, props.style]}
    />
  );
}

/** A labelled input with room for a hint or an error underneath. */
export function Field({
  label,
  error,
  help,
  ...input
}: TextInputProps & { label: string; error?: string | null; help?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt style={styles.fieldLabel}>{label}</Txt>
      <Input accessibilityLabel={label} {...input} style={[error ? { borderColor: palette.danger } : null, input.style]} />
      {error ? (
        <Txt accessibilityLiveRegion="polite" style={styles.fieldError}>{error}</Txt>
      ) : help ? (
        <Muted>{help}</Muted>
      ) : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const { brand } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      style={[styles.chip, { borderColor: active ? brand[700] : brand[300], backgroundColor: active ? brand[700] : "transparent" }]}
    >
      <Text style={{ color: active ? "#FFFFFF" : brand[700], fontWeight: "700", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function ListRow({ children, style, ...props }: ViewProps & { children: ReactNode }) {
  return <View {...props} style={[styles.listRow, style]}>{children}</View>;
}

export function LoadingLine({ label = "Loading..." }: { label?: string }) {
  return <Txt style={styles.loading}>{label}</Txt>;
}

/** Grey blocks standing in for content that is on its way. */
export function Skeleton({ height = 72 }: { height?: number }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.skeleton, { height }]} />;
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { brand } = useTheme();
  const letters = name.split(/\s+/).map((word) => word[0] ?? "").join("").slice(0, 2).toUpperCase();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand[100], alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: brand[800], fontWeight: "800", fontSize: size * 0.36 }}>{letters}</Text>
    </View>
  );
}

/** A full-width row that leads somewhere, with an icon and a chevron. */
export function RowLink({
  icon,
  title,
  subtitle,
  onPress,
  badge,
  tone = "brand",
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string;
  tone?: "brand" | "danger";
}) {
  const { brand, isRTL } = useTheme();
  const tint = tone === "danger" ? palette.danger : brand[700];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => [styles.rowLink, pressed && { backgroundColor: "#F1F5F9" }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tone === "danger" ? palette.dangerBg : brand[50] }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={{ color: tone === "danger" ? palette.danger : palette.ink, fontWeight: "700", fontSize: 16 }}>{title}</Txt>
        {subtitle ? <Muted>{subtitle}</Muted> : null}
      </View>
      {badge ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
      ) : null}
      <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color="#64748B" />
    </Pressable>
  );
}

/** A horizontal bar showing a share of 100. */
export function Meter({ value, tone = "brand", label }: { value: number; tone?: "brand" | "danger" | "accent"; label: string }) {
  const { brand } = useTheme();
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const fill = tone === "danger" ? palette.danger : tone === "accent" ? palette.accent : brand[600];
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={styles.meter}
    >
      <View style={{ width: `${clamped}%`, height: "100%", borderRadius: 999, backgroundColor: fill }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.page },
  screen: { flex: 1, backgroundColor: palette.page, padding: spacing.lg, gap: spacing.md },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  footer: { padding: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: palette.line, backgroundColor: palette.surface },
  title: { fontSize: 28, fontWeight: "800", color: palette.ink, letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: "800", color: palette.ink },
  muted: { fontSize: 14, color: palette.muted, lineHeight: 20 },
  brandHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: 4 },
  brandTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  brandSubtitle: { color: "rgba(255,255,255,0.88)", fontSize: 14 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm,
    ...shadow.card,
  },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: palette.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  emptyState: { paddingVertical: spacing.xl, alignItems: "center", gap: spacing.xs },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: palette.ink, textAlign: "center" },
  emptyDescription: { fontSize: 14, color: palette.muted, textAlign: "center" },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  pillText: { fontSize: 12, fontWeight: "800" },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontWeight: "800", fontSize: 16 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: palette.field,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.ink,
    backgroundColor: palette.surface,
  },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  fieldLabel: { fontSize: 14, fontWeight: "700", color: palette.ink },
  fieldError: { fontSize: 14, fontWeight: "700", color: palette.danger },
  chip: { minHeight: 40, justifyContent: "center", borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.lg },
  listRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.line, gap: 4 },
  loading: { fontSize: 14, color: palette.muted, paddingVertical: spacing.sm },
  skeleton: { borderRadius: radius.lg, backgroundColor: "#E2E8F0" },
  rowLink: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badge: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: palette.accent, alignItems: "center", justifyContent: "center" },
  badgeText: { color: palette.accentInk, fontWeight: "800", fontSize: 12 },
  meter: { height: 10, borderRadius: 999, backgroundColor: "#E2E8F0", overflow: "hidden" },
});
