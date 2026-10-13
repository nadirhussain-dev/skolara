import { useTranslation } from "@skolara/i18n";
import { RoleTabs } from "@/components/tabs";
import { ChildProvider } from "@/lib/child-context";

export default function FamilyLayout() {
  const { t } = useTranslation();
  return (
    <ChildProvider>
      <RoleTabs
        tabs={[
          { name: "index", title: t("app.tabHome"), icon: "home" },
          { name: "fees", title: t("app.tabFees"), icon: "wallet" },
          { name: "results", title: t("app.tabResults"), icon: "ribbon" },
          { name: "inbox", title: t("app.tabInbox"), icon: "notifications", inbox: true },
          { name: "more", title: t("app.tabMore"), icon: "menu" },
        ]}
      />
    </ChildProvider>
  );
}
