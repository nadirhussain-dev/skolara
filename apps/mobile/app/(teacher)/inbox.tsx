import { InboxScreen } from "@/components/inbox";

export default function TeacherInbox() {
  return <InboxScreen routes={{ MESSAGE: "/messages", MEETING: "/meetings", LEAVE: "/leave" }} />;
}
