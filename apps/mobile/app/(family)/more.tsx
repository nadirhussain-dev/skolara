import { useTranslation } from "@skolara/i18n";
import { MoreScreen } from "@/components/more";

export default function FamilyMore() {
  const { t } = useTranslation();
  return (
    <MoreScreen
      links={[
        { icon: "medkit-outline", title: t("app.reportAbsence"), href: "/absences" },
        { icon: "book-outline", title: t("app.homework"), href: "/assignments/mine" },
        { icon: "chatbubbles-outline", title: t("app.messageTeacher"), href: "/messages" },
        { icon: "megaphone-outline", title: t("app.complaints"), href: "/complaints" },
        { icon: "calendar-outline", title: t("app.timetable"), href: "/timetable" },
      ]}
    />
  );
}
