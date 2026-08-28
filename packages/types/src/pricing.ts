import type { SubscriptionPlan } from "./tenant";

/**
 * Published pricing, in PKR per month.
 *
 * Deliberately a constant in shared code rather than a database table: the
 * pricing page, the signup flow and the platform's MRR calculation must never
 * disagree about what a plan costs, and transparent self-serve pricing is a
 * positioning choice, not per-customer configuration. Negotiated enterprise
 * deals are handled by talking to sales, not by editing a row.
 */
export interface PlanDetails {
  plan: SubscriptionPlan;
  name: string;
  /** PKR per month. Null for ENTERPRISE, which is quoted individually. */
  monthlyPricePkr: number | null;
  /** Hard cap on enrolled students; null on ENTERPRISE. */
  maxStudents: number | null;
  tagline: string;
  features: string[];
}

export const TRIAL_DAYS = 14;

export const PLANS: Record<SubscriptionPlan, PlanDetails> = {
  BASIC: {
    plan: "BASIC",
    name: "Basic",
    monthlyPricePkr: 3000,
    maxStudents: 200,
    tagline: "For a single small school getting off paper.",
    features: [
      "Students, teachers, classes",
      "Attendance and gradebook",
      "Fee invoices and manual payment verification",
      "Notices and WhatsApp alerts",
      "Parent and teacher mobile apps",
    ],
  },
  STANDARD: {
    plan: "STANDARD",
    name: "Standard",
    monthlyPricePkr: 7000,
    maxStudents: 600,
    tagline: "For an established school running everything in one place.",
    features: [
      "Everything in Basic",
      "Exams, report cards and rank lists",
      "Homework and assignment submissions",
      "Parent–teacher messaging and complaints",
      "Library and transport",
      "Bank statement matching",
    ],
  },
  PREMIUM: {
    plan: "PREMIUM",
    name: "Premium",
    monthlyPricePkr: 15000,
    maxStudents: 2000,
    tagline: "For larger schools that want the AI and analytics layer.",
    features: [
      "Everything in Standard",
      "AI report-card comments",
      "AI fee-defaulter risk flagging",
      "Payroll and payslips",
      "Analytics dashboards",
      "White-labelling and custom subdomain",
      "API access",
    ],
  },
  ENTERPRISE: {
    plan: "ENTERPRISE",
    name: "Enterprise",
    monthlyPricePkr: null,
    maxStudents: null,
    tagline: "For school networks and multi-campus groups.",
    features: [
      "Everything in Premium",
      "Multi-campus school groups",
      "Unlimited students",
      "Priority support in Urdu and English",
      "Custom integrations",
    ],
  },
};

export const PLAN_ORDER: SubscriptionPlan[] = [
  "BASIC",
  "STANDARD",
  "PREMIUM",
  "ENTERPRISE",
];

/**
 * What a school on this plan contributes to MRR. Enterprise is quoted
 * individually, so it contributes nothing to the automatic figure rather than
 * being guessed at — the platform owner tracks those separately.
 */
export function monthlyRevenueFor(plan: SubscriptionPlan): number {
  return PLANS[plan].monthlyPricePkr ?? 0;
}

/**
 * Gated capabilities. Separate from the marketing `features` copy above:
 * those are sentences on a pricing page, these are enforced at the API.
 */
export const FEATURES = [
  "EXAMS",
  "ASSIGNMENTS",
  "MESSAGING",
  "COMPLAINTS",
  "LIBRARY",
  "TRANSPORT",
  "BANK_STATEMENT",
  "PAYROLL",
  "ANALYTICS",
  "AI",
  "WHITE_LABEL",
  "API_ACCESS",
  "SCHOOL_GROUPS",
] as const;
export type Feature = (typeof FEATURES)[number];

const BASIC_FEATURES: Feature[] = [];

const STANDARD_FEATURES: Feature[] = [
  ...BASIC_FEATURES,
  "EXAMS",
  "ASSIGNMENTS",
  "MESSAGING",
  "COMPLAINTS",
  "LIBRARY",
  "TRANSPORT",
  "BANK_STATEMENT",
];

const PREMIUM_FEATURES: Feature[] = [
  ...STANDARD_FEATURES,
  "PAYROLL",
  "ANALYTICS",
  "AI",
  "WHITE_LABEL",
  "API_ACCESS",
];

const ENTERPRISE_FEATURES: Feature[] = [...PREMIUM_FEATURES, "SCHOOL_GROUPS"];

/**
 * Cumulative by construction — each tier spreads the one below it — so a
 * feature can never be present in Standard and accidentally absent from
 * Premium, which is the way this kind of table usually rots.
 */
export const PLAN_ENTITLEMENTS: Record<SubscriptionPlan, readonly Feature[]> = {
  BASIC: BASIC_FEATURES,
  STANDARD: STANDARD_FEATURES,
  PREMIUM: PREMIUM_FEATURES,
  ENTERPRISE: ENTERPRISE_FEATURES,
};

export function planIncludes(plan: SubscriptionPlan, feature: Feature): boolean {
  return PLAN_ENTITLEMENTS[plan].includes(feature);
}
