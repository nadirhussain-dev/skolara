/** Soft background and strong ink per subject, so a day's lessons read at a glance. Same hash as the web grid. */
const PAIRS: [string, string][] = [
  ["#EEF2FF", "#3730A3"],
  ["#ECFDF5", "#065F46"],
  ["#FFFBEB", "#92400E"],
  ["#F0F9FF", "#075985"],
  ["#FFF1F2", "#9F1239"],
  ["#F5F3FF", "#5B21B6"],
  ["#F0FDFA", "#115E59"],
  ["#FFF7ED", "#9A3412"],
];

export function subjectColour(subject: string): { bg: string; fg: string } {
  let hash = 0;
  for (const char of subject.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const [bg, fg] = PAIRS[hash % PAIRS.length]!;
  return { bg, fg };
}
