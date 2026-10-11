import { z } from "zod";

/**
 * A web address someone typed or an app submitted: http or https only.
 *
 * Zod's `.url()` alone also accepts `javascript:` and `data:`. These strings
 * are later used as links and image sources in other people's sessions, so
 * accepting those schemes would let one user run script as another.
 *
 * Matched with a scheme prefix rather than `new URL()`: this package is
 * shared with React Native and compiles without DOM or Node lib definitions.
 */
export const httpUrlSchema = z
  .string()
  .url()
  .max(2000)
  .refine((value) => /^https?:\/\//i.test(value), { message: "Expected an http or https address" });
