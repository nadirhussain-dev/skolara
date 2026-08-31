import { currentSubdomain } from "@/lib/tenant";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const hostSubdomain = await currentSubdomain();
  return <ForgotPasswordForm hostSubdomain={hostSubdomain} />;
}
