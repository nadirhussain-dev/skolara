import Svg, { Circle, Path, Rect } from "react-native-svg";

/**
 * The Skolara mark: one continuous S stroke in a rounded tile with an amber
 * dot. Same geometry as `SkolaraMark` in @skolara/ui.
 */
export function SkolaraMark({ size = 48, reversed = false }: { size?: number; reversed?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Skolara">
      <Rect width={64} height={64} rx={16} fill={reversed ? "#FFFFFF" : "#3730A3"} />
      <Path
        d="M38 18H28a7 7 0 0 0 0 14h8a7 7 0 0 1 0 14H22"
        fill="none"
        stroke={reversed ? "#3730A3" : "#FFFFFF"}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={47} cy={18} r={4.5} fill="#F59E0B" />
    </Svg>
  );
}
