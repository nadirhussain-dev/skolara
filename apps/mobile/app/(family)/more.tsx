import { useTranslation } from "@skolara/i18n";
import { MoreScreen } from "@/components/more";

export default function FamilyMore() {
  const { t } = useTranslation();
  return (
    <MoreScreen
      links={[
        { icon: "book-outline", title: t("app.homework"), href: "/assignments/mine" },
        { icon: "time-outline", title: t("app.timetable"), href: "/timetable" },
        { icon: "chatbubbles-outline", title: t("app.messageTeacher"), href: "/messages" },
        { icon: "medkit-outline", title: t("app.reportAbsence"), href: "/absences" },
        { icon: "people-outline", title: t("nav.meetings"), href: "/meetings" },
        { icon: "calendar-outline", title: t("nav.calendar"), href: "/calendar" },
        { icon: "megaphone-outline", title: t("everyday.raiseConcern"), href: "/complaints" },
      ]}
    />
  );
}
