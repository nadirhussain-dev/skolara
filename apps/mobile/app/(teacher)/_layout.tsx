import { useTranslation } from "@skolara/i18n";
import { RoleTabs } from "@/components/tabs";

export default function TeacherLayout() {
  const { t } = useTranslation();
  return (
    <RoleTabs
      tabs={[
        { name: "index", title: t("app.tabHome"), icon: "home" },
        { name: "inbox", title: t("app.tabInbox"), icon: "notifications", inbox: true },
        { name: "more", title: t("app.tabMore"), icon: "menu" },
      ]}
    />
  );
}
