import { SetMetadata } from "@nestjs/common";
import type { Feature } from "@skolara/types";

export const FEATURE_KEY = "requiredFeature";

/**
 * Gates a controller or route behind the school's subscription plan. Enforced
 * by FeatureGuard — hiding a nav item in the web app is a UX nicety, not a
 * control, since the endpoint is reachable regardless.
 */
export const RequiresFeature = (feature: Feature) => SetMetadata(FEATURE_KEY, feature);
