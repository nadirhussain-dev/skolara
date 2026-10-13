import { InboxScreen } from "@/components/inbox";

export default function AdminInbox() {
  return <InboxScreen routes={{ EXPENSE: "/(admin)/finance" }} />;
}
