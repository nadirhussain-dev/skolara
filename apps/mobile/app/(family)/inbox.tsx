import { InboxScreen } from "@/components/inbox";

export default function FamilyInbox() {
  return (
    <InboxScreen
      routes={{
        FEE_REMINDER: "/(family)/fees",
        PAYMENT: "/(family)/fees",
        ATTENDANCE: "/(family)",
        ABSENCE_REQUEST: "/absences",
        MESSAGE: "/messages",
        COMPLAINT: "/complaints",
        MEETING: "/meetings",
        HOMEWORK: "/assignments/mine",
      }}
    />
  );
}
