import { useTranslation } from "@skolara/i18n";
import { RoleTabs } from "@/components/tabs";

export default function AdminLayout() {
  const { t } = useTranslation();
  return (
    <RoleTabs
      tabs={[
        { name: "index", title: t("app.tabHome"), icon: "home" },
        { name: "finance", title: t("app.tabFinance"), icon: "stats-chart" },
        { name: "inbox", title: t("app.tabInbox"), icon: "notifications", inbox: true },
        { name: "more", title: t("app.tabMore"), icon: "menu" },
      ]}
    />
  );
}
