import { currentSubdomain } from "@/lib/tenant";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Read on the server: the tenant header is set by middleware and never
  // reaches the browser bundle.
  const hostSubdomain = await currentSubdomain();
  return <LoginForm hostSubdomain={hostSubdomain} />;
}
