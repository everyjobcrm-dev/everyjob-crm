/**
 * Operator details shown on the legal pages (/privacy, /terms, /accessibility) and the version stored with each
 * signup's consent. Fill these before going public; a lawyer must review the three pages before launch.
 * Bump LEGAL_VERSION whenever the text of /terms or /privacy changes in substance.
 */
export const LEGAL_VERSION = "2026-11-15";
export const LEGAL_UPDATED_LABEL = "15 בנובמבר 2026";

export const OPERATOR = {
  // shortcut: placeholders until the buyer's legal entity is known; replace before the site is public.
  name: "everyJob",
  contactEmail: "privacy@everyjob.co.il",
  accessibilityCoordinator: "רכז/ת הנגישות של everyJob",
  accessibilityEmail: "access@everyjob.co.il",
} as const;
