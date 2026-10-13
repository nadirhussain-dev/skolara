import { useTranslation } from "@skolara/i18n";
import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { readProfile, signOut, type Profile } from "@/lib/auth";
import { LanguageToggle } from "@/lib/language-toggle";
import { SkolaraMark } from "@/lib/logo";
import { palette, useTheme } from "@/lib/school-theme";
import { spacing } from "@/lib/theme";
import { Avatar, BrandHeader, Card, type IconName, Muted, RowLink, ScreenScroll, SectionLabel, Txt } from "@/lib/ui";

export interface MoreLink {
  icon: IconName;
  title: string;
  href: Href;
}

/** The More tab for every role: who is signed in, the extra screens, language and sign-out. */
export function MoreScreen({ links }: { links: MoreLink[] }) {
  const { t } = useTranslation();
  const { school } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;
    void readProfile().then((value) => {
      if (active) setProfile(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const name = profile ? `${profile.firstName} ${profile.lastName}` : "";

  function confirmSignOut() {
    Alert.alert(t("app.signOut"), t("app.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("app.signOut"), style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <ScreenScroll header={<BrandHeader title={t("app.tabMore")} subtitle={school?.name} />}>
      {profile && (
        <Card style={styles.profile}>
          <Avatar name={name} size={48} />
          <View style={{ flex: 1 }}>
            <Txt style={{ color: palette.ink, fontWeight: "800", fontSize: 17 }}>{name}</Txt>
            <Muted>{profile.email}</Muted>
            <Muted>{t(`roles.${profile.role}`)}</Muted>
          </View>
        </Card>
      )}

      {links.length > 0 && (
        <Card style={styles.list}>
          {links.map((link, index) => (
            <View key={link.title} style={index > 0 ? styles.divider : undefined}>
              <RowLink icon={link.icon} title={link.title} onPress={() => router.push(link.href)} />
            </View>
          ))}
        </Card>
      )}

      <SectionLabel>{t("app.language")}</SectionLabel>
      <LanguageToggle />

      <Card style={styles.list}>
        <RowLink icon="log-out-outline" title={t("app.signOut")} tone="danger" onPress={confirmSignOut} />
      </Card>

      <View style={styles.signature}>
        <SkolaraMark size={20} />
        <Muted style={{ fontSize: 12 }}>{t("app.poweredBy")}</Muted>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  list: { padding: 0, gap: 0, overflow: "hidden" },
  divider: { borderTopWidth: 1, borderTopColor: palette.line },
  signature: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.md },
});
