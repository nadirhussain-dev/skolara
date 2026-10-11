import Link from "next/link";
import { StatusPage, statusLink } from "@/components/status-page";

export const metadata = { title: "Use the Skolara app" };

export default function MobileOnlyPage() {
  return (
    <StatusPage
      title="Parents and students use the Skolara app"
      body="Attendance, results, fees and messages from school are in the Skolara mobile app. Open it on your phone and enter your school code to sign in."
    >
      <Link href="/login" className={statusLink}>Back to sign in</Link>
    </StatusPage>
  );
}
