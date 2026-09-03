"use client";

import type { SubjectPerformance } from "@skolara/types";
import { useId, useState } from "react";

/**
 * One subject's marks over time, as a small multiple.
 *
 * Small multiples rather than one chart with a line per subject: a student
 * takes six or eight subjects, and eight categorical hues on one axis buries
 * the thing a parent came to find. Faceting keeps each subject to two series,
 * which is the only count where colour alone is comfortable for everyone.
 *
 * Those two series are an emphasis pair, not a categorical one — the student in
 * the brand hue, the class average in the de-emphasis grey. The pair was
 * checked for CVD separation and surface contrast in both themes: slate-500
 * clears 3:1 against the white card and against the dark one, and separates
 * from brand-700 (light) and brand-400 (dark) well above the normal-vision
 * floor. Swapping either colour means re-checking, not eyeballing.
 */

const WIDTH = 320;
const HEIGHT = 138;
const PADDING = { top: 16, right: 16, bottom: 26, left: 30 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

/** Percentages have a fixed, meaningful scale — never fit the axis to data. */
const Y_TICKS = [0, 50, 100];

/** Above this, an endpoint label sits below its marker instead of above it. */
const LABEL_FLIP_ABOVE = 88;
/** Below this, there is no room under the marker to flip into. */
const LABEL_FLOOR = 14;
/** Within this many points, a label above the marker would cross the grey line. */
const LABEL_CLEARANCE = 14;

function x(index: number, count: number): number {
  if (count === 1) return PADDING.left + PLOT_WIDTH / 2;
  return PADDING.left + (index / (count - 1)) * PLOT_WIDTH;
}

function y(percentage: number): number {
  return PADDING.top + (1 - percentage / 100) * PLOT_HEIGHT;
}

function path(values: (number | null)[], count: number): string {
  return values
    .map((value, index) => (value === null ? null : `${x(index, count)},${y(value)}`))
    .filter((point): point is string => point !== null)
    .map((point, index) => `${index === 0 ? "M" : "L"}${point}`)
    .join(" ");
}

export function SubjectPerformanceChart({
  subject,
  studentLabel,
}: {
  subject: SubjectPerformance;
  studentLabel: string;
}) {
  const titleId = useId();
  const [active, setActive] = useState<number | null>(null);
  const { points } = subject;
  const count = points.length;
  const hasCohort = points.some((point) => point.classAveragePercentage !== null);
  const first = points[0];
  const last = points[count - 1];
  const hovered = active === null ? null : points[active];

  // The endpoint label sits above its marker by default, and flips below for
  // two reasons: near the ceiling, where above would fall outside the viewBox
  // and get clipped, and when the class average runs just above the student's
  // mark, where above would put the text straight through the grey line.
  const cohortAtEnd = last?.classAveragePercentage ?? null;
  const cohortJustAbove =
    last !== undefined &&
    cohortAtEnd !== null &&
    cohortAtEnd > last.percentage &&
    cohortAtEnd - last.percentage < LABEL_CLEARANCE;
  const labelBelow =
    last !== undefined &&
    (last.percentage > LABEL_FLIP_ABOVE ||
      // Not into the floor: a flip that clips is no better than a collision.
      (cohortJustAbove && last.percentage > LABEL_FLOOR));

  return (
    <figure className="m-0 flex flex-col gap-1">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="font-medium">{subject.subject}</span>
        {/*
          The readout lives here rather than in a floating tooltip: on a facet
          this small, a box over the plot covers the data it is describing. A
          fixed slot also means keyboard focus announces the same thing hover
          shows, with no positioning logic.
        */}
        <span aria-live="polite" className="text-sm text-slate-500 dark:text-slate-400">
          {hovered ? (
            <>
              <span>{hovered.term} · {hovered.examType}</span>
              {" — "}
              <span className="inline-flex items-center gap-1 align-middle">
                <span className="inline-block h-0.5 w-3 bg-brand-700 dark:bg-brand-400" />
                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {hovered.percentage}%
                </span>
              </span>
              {hovered.classAveragePercentage !== null && (
                <span className="ml-2 inline-flex items-center gap-1 align-middle">
                  <span className="inline-block h-0.5 w-3 bg-slate-500" />
                  <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {hovered.classAveragePercentage}%
                  </span>
                </span>
              )}
            </>
          ) : (
            <span className="tabular-nums">
              avg {subject.average}%
              {subject.classAverage !== null && ` · class ${subject.classAverage}%`}
            </span>
          )}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby={titleId}
        onPointerLeave={() => setActive(null)}
      >
        <title id={titleId}>
          {`${subject.subject}: ${studentLabel} averaged ${subject.average}% over ${count} assessment${count === 1 ? "" : "s"}.`}
        </title>

        {/* Solid hairline grid, one step off the surface. */}
        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(tick)}
              y2={y(tick)}
              strokeWidth={1}
              className="stroke-slate-200 dark:stroke-slate-800"
            />
            <text
              x={PADDING.left - 6}
              y={y(tick) + 3}
              textAnchor="end"
              className="fill-slate-400 text-[9px] tabular-nums dark:fill-slate-500"
            >
              {tick}
            </text>
          </g>
        ))}

        {hasCohort && count > 1 && (
          <path
            d={path(
              points.map((point) => point.classAveragePercentage),
              count,
            )}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="stroke-slate-500"
          />
        )}

        {/*
          A one-point path has no stroke length, so on a subject with a single
          assessment the class average would silently disappear. Drawn as a
          short reference rule instead — the comparison is the reason the grey
          series exists, and a missing one reads as "no data".
        */}
        {hasCohort && count === 1 && first?.classAveragePercentage != null && (
          <line
            x1={x(0, 1) - 22}
            x2={x(0, 1) + 22}
            y1={y(first.classAveragePercentage)}
            y2={y(first.classAveragePercentage)}
            strokeWidth={2}
            strokeLinecap="round"
            className="stroke-slate-500"
          />
        )}

        <path
          d={path(
            points.map((point) => point.percentage),
            count,
          )}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-brand-700 dark:stroke-brand-400"
        />

        {/* Markers carry a 2px surface ring so they stay legible where the two
            lines cross each other. */}
        {points.map((point, index) => (
          <circle
            key={`${point.term}-${point.examType}`}
            cx={x(index, count)}
            cy={y(point.percentage)}
            r={4}
            strokeWidth={2}
            className="fill-brand-700 stroke-white dark:fill-brand-400 dark:stroke-slate-900"
          />
        ))}

        {/* Only the endpoint is directly labelled — a number on every point
            goes unread. The rest are in the readout and the table view. */}
        {last && (
          <text
            x={count === 1 ? x(0, 1) : x(count - 1, count)}
            y={labelBelow ? y(last.percentage) + 15 : y(last.percentage) - 8}
            textAnchor={count === 1 ? "middle" : "end"}
            className="fill-slate-600 text-[10px] font-semibold tabular-nums dark:fill-slate-300"
          >
            {last.percentage}%
          </text>
        )}

        {/* The x axis carries the ends only. Six exam names across 320px would
            collide, and the readout names whichever point the reader is on. */}
        {first && (
          <text
            x={count === 1 ? x(0, 1) : PADDING.left}
            y={HEIGHT - 8}
            textAnchor={count === 1 ? "middle" : "start"}
            className="fill-slate-400 text-[9px] dark:fill-slate-500"
          >
            {first.term}
          </text>
        )}
        {count > 1 && last && last.term !== first?.term && (
          <text
            x={WIDTH - PADDING.right}
            y={HEIGHT - 8}
            textAnchor="end"
            className="fill-slate-400 text-[9px] dark:fill-slate-500"
          >
            {last.term}
          </text>
        )}

        {/* Transparent hit bands: the pointer only has to be nearest, not on
            the 8px marker. Focusable, so keyboard gets the same readout. */}
        {points.map((point, index) => {
          const band = count === 1 ? PLOT_WIDTH : PLOT_WIDTH / (count - 1);
          return (
            <rect
              key={`hit-${point.term}-${point.examType}`}
              x={x(index, count) - band / 2}
              y={PADDING.top}
              width={band}
              height={PLOT_HEIGHT}
              fill="transparent"
              tabIndex={0}
              aria-label={`${point.term} ${point.examType}: ${point.percentage}%`}
              onPointerEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            />
          );
        })}

        {/* Crosshair last, so it draws over the marks it is pointing at. */}
        {active !== null && (
          <line
            x1={x(active, count)}
            x2={x(active, count)}
            y1={PADDING.top}
            y2={PADDING.top + PLOT_HEIGHT}
            strokeWidth={1}
            className="stroke-slate-300 dark:stroke-slate-700"
          />
        )}
      </svg>
    </figure>
  );
}

/**
 * Identity never rests on colour alone, so the two series are named as well as
 * drawn. One legend for the whole grid — every facet shares the encoding.
 */
export function PerformanceLegend({ studentLabel }: { studentLabel: string }) {
  return (
    <ul className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-4 bg-brand-700 dark:bg-brand-400" />
        {studentLabel}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-4 bg-slate-500" />
        Class average
      </li>
    </ul>
  );
}
