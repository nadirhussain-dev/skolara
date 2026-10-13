import Link from "next/link";
import { StatusPage, statusLink } from "@/components/status-page";

export default function NotFound() {
  return (
    <StatusPage code="404" title="We could not find that page" body="The address may be mistyped, or the page may have moved.">
      <Link href="/" className={statusLink}>Go to the home page</Link>
    </StatusPage>
  );
}
