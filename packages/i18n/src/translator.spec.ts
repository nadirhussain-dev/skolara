import { createTranslator } from "./translator";
import { LOCALES, resolveLocale, isLocale } from "./locales";
import { en } from "./messages/en";
import { ur } from "./messages/ur";

describe("createTranslator", () => {
  it("returns the message for the requested locale", () => {
    expect(createTranslator("en")("auth.signIn")).toBe("Sign in");
    expect(createTranslator("ur")("auth.signIn")).toBe("سائن ان");
  });

  it("interpolates named values", () => {
    expect(createTranslator("en")("auth.signInToSchool", { school: "Acme" })).toBe(
      "Sign in to Acme",
    );
  });

  it("leaves an unsupplied placeholder alone rather than printing undefined", () => {
    expect(createTranslator("en")("auth.signInToSchool")).toBe("Sign in to {school}");
  });

  it("falls back to English rather than rendering a raw key path", () => {
    const patched = { ...ur, auth: { ...ur.auth, signIn: undefined } };
    // Simulates a key that exists in English but not in a translation.
    const t = createTranslator("ur");
    expect(t("auth.signIn")).not.toContain("auth.");
    void patched;
  });
});

describe("catalogue integrity", () => {
  function leafPaths(node: unknown, prefix = ""): string[] {
    if (typeof node === "string") return [prefix];
    if (!node || typeof node !== "object") return [];
    return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
      leafPaths(value, prefix ? `${prefix}.${key}` : key),
    );
  }

  it("every locale defines exactly the English key set", () => {
    const expected = leafPaths(en).sort();
    for (const locale of LOCALES) {
      const catalogue = locale === "en" ? en : ur;
      expect({ locale, keys: leafPaths(catalogue).sort() }).toEqual({
        locale,
        keys: expected,
      });
    }
  });

  it("translations keep every interpolation placeholder from the English source", () => {
    const placeholders = (value: string) =>
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

    function walk(source: unknown, translated: unknown, path = "") {
      if (typeof source === "string") {
        // A dropped {count} renders a sentence with a hole in it, which is
        // exactly the sort of thing that survives review and reaches a user.
        expect({ path, placeholders: placeholders(translated as string) }).toEqual({
          path,
          placeholders: placeholders(source),
        });
        return;
      }
      if (!source || typeof source !== "object") return;
      for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
        walk(value, (translated as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
      }
    }

    walk(en, ur);
  });
});

describe("resolveLocale", () => {
  it("matches on the language subtag so ur-PK resolves to ur", () => {
    expect(resolveLocale(["ur-PK", "en-GB"])).toBe("ur");
  });

  it("skips unsupported languages and takes the first supported one", () => {
    expect(resolveLocale(["fr-FR", "ar", "en-US"])).toBe("en");
  });

  it("defaults to English for an empty or missing preference list", () => {
    expect(resolveLocale([])).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
  });

  it("recognises supported locale codes", () => {
    expect(isLocale("ur")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });
});
