import { useTranslation } from "@skolara/i18n";
import { MoreScreen } from "@/components/more";

export default function TeacherMore() {
  const { t } = useTranslation();
  return (
    <MoreScreen
      links={[
        { icon: "time-outline", title: t("app.timetable"), href: "/timetable" },
        { icon: "book-outline", title: t("app.homework"), href: "/assignments" },
        { icon: "chatbubbles-outline", title: t("nav.messages"), href: "/messages" },
        { icon: "airplane-outline", title: t("app.leave"), href: "/leave" },
        { icon: "people-outline", title: t("nav.meetings"), href: "/meetings" },
        { icon: "calendar-outline", title: t("nav.calendar"), href: "/calendar" },
      ]}
    />
  );
}
