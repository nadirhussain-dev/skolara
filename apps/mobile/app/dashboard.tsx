import { Redirect } from "expo-router";

/** Kept so old links and notification taps still land somewhere sensible. */
export default function LegacyHome() {
  return <Redirect href="/" />;
}
