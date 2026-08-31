import { LOCALES, LOCALE_META, useTranslation } from "@skolara/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "./theme";

/**
 * Each language is labelled in its own script — a parent who only reads Urdu
 * can't be expected to find it behind the English word "Urdu".
 */
export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <View style={styles.row}>
      {LOCALES.map((code) => {
        const active = locale === code;
        return (
          <Pressable
            key={code}
            onPress={() => setLocale(code)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {LOCALE_META[code].nativeName}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.slate[100],
  },
  chipActive: { backgroundColor: colors.brand[50] },
  label: { ...typography.body, fontSize: 13, color: colors.slate[500] },
  labelActive: { color: colors.brand[700], fontWeight: "600" },
});
