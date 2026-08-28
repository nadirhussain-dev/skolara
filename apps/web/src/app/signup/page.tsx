import type { SubscriptionPlan } from "@skolara/types";
import { SignupForm } from "./signup-form";

const SELF_SERVE_PLANS = new Set<SubscriptionPlan>(["BASIC", "STANDARD", "PREMIUM"]);

export const metadata = {
  title: "Start your free trial — Skolara",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  // Pre-selects whichever plan they clicked on the pricing page, falling back
  // to the mid tier rather than trusting an arbitrary query value.
  const { plan } = await searchParams;
  const initialPlan =
    plan && SELF_SERVE_PLANS.has(plan as SubscriptionPlan)
      ? (plan as SubscriptionPlan)
      : "STANDARD";

  return <SignupForm initialPlan={initialPlan} />;
}
