/**
 * Public-profile credential row: NCAA ID + recruiting-service external links,
 * built off the already-exposed `PublicProfileData.athletic` section (plus
 * the athlete's public display name, needed for one service's link). Pure —
 * no fetching, no DOM.
 *
 * Label + link resolution is delegated entirely to `ALL_SERVICE_DEFS` /
 * `serviceProfileUrl` (utils/services/canonical.ts) — the single source of
 * truth for service labels and URL templates. Two services can never
 * produce a badge here, both by design of `serviceProfileUrl`:
 *  - NCSA (`ncsa_id`) — signup-only, no `urlTemplate`, so it never resolves
 *    a public profile URL.
 *  - Prep Baseball Report (`prep_baseball_id`) — its profile link is a
 *    slug built from `prep_baseball_state` + the athlete's *name*
 *    (`buildPrepBaseballUrl`, real per-athlete profile URLs, e.g.
 *    `/profiles/OH/owen-andrikanich` — not a search page). `playerName` is
 *    optional here specifically to carry that in; when either the state or
 *    the name is genuinely missing, `serviceProfileUrl` returns null and
 *    PBR is skipped rather than linked to a broken/guessed URL.
 */

import { ALL_SERVICE_DEFS, serviceProfileUrl } from "~/utils/services/canonical";
import type { PublicProfileData } from "~/types/models";

export type PublicAthletic = NonNullable<PublicProfileData["athletic"]>;

export interface RecruitingCredentialService {
  key: string;
  label: string;
  url: string;
}

export interface RecruitingCredentials {
  ncaaId: string | null;
  services: RecruitingCredentialService[];
}

export function buildRecruitingCredentials(
  athletic: Partial<PublicAthletic> | null | undefined,
  playerName?: string | null,
): RecruitingCredentials {
  if (!athletic) return { ncaaId: null, services: [] };

  const values = athletic as Record<string, string | undefined>;

  const services = ALL_SERVICE_DEFS.reduce<RecruitingCredentialService[]>(
    (acc, def) => {
      const value = values[def.key];
      if (!value) return acc;

      const url = serviceProfileUrl(def, {
        value,
        state: athletic.prep_baseball_state,
        name: playerName,
      });
      if (!url) return acc;

      return [...acc, { key: def.key, label: def.label, url }];
    },
    [],
  );

  return { ncaaId: athletic.ncaa_id ?? null, services };
}
