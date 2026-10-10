"use client";

import { useMySchool } from "@skolara/api-client";
import { brandCssVariables, isHexColor } from "@skolara/utils";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * Remembered between visits so a returning admin sees their school's colour
 * on first paint instead of a flash of the Skolara default while the school
 * record loads.
 */
const STORAGE_KEY = "skolara.brandColor";

function apply(color: string): () => void {
  const root = document.documentElement;
  const variables = brandCssVariables(color);
  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
  return () => {
    for (const name of Object.keys(variables)) root.style.removeProperty(name);
  };
}

function remembered(): string | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isHexColor(value) ? value : null;
  } catch {
    // Private windows and blocked storage: theming still works, it just
    // can't skip the first-paint default.
    return null;
  }
}

function remember(color: string | null) {
  try {
    if (color) window.localStorage.setItem(STORAGE_KEY, color);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* see remembered() */
  }
}

/**
 * Applies the signed-in school's primary colour to the dashboard by
 * overriding the brand CSS variables on <html>. Renders nothing.
 *
 * The platform owner has no school and always gets the Skolara default.
 * Unmounting (sign-out, leaving the dashboard) restores the default, so the
 * public pages are never left wearing a school's colours.
 */
export function SchoolTheme() {
  const { user } = useAuth();
  const hasSchool = Boolean(user) && user?.role !== "SUPER_ADMIN";
  const { data: school } = useMySchool({ enabled: hasSchool });
  const loaded = school !== undefined;
  const color = school?.primaryColor ?? null;

  useEffect(() => {
    if (!hasSchool) return;
    // Until the school record arrives, fall back on last visit's colour.
    const active = loaded ? color : remembered();
    if (loaded) remember(isHexColor(color) ? color : null);
    if (!isHexColor(active)) return;
    return apply(active);
  }, [hasSchool, loaded, color]);

  return null;
}
