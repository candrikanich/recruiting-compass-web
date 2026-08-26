/**
 * Maps a stored `header_color` value (the enum accepted by
 * server/api/player/profile.put.ts) to the dark Tailwind background class used
 * for the public profile hero. Full literal class strings so Tailwind's JIT
 * scanner picks them up. Unknown values fall back to the slate default.
 */
const HERO_BACKGROUND_CLASSES: Record<string, string> = {
  slate: "bg-brand-slate-900",
  blue: "bg-brand-blue-900",
  emerald: "bg-brand-emerald-900",
  indigo: "bg-brand-indigo-900",
  teal: "bg-teal-900",
  rose: "bg-rose-900",
  violet: "bg-violet-900",
  amber: "bg-amber-900",
};

export function heroBackgroundClass(color: string | null | undefined): string {
  return HERO_BACKGROUND_CLASSES[color ?? "slate"] ?? "bg-brand-slate-900";
}
