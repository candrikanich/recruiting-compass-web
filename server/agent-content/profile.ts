import type { PublicProfileData } from "~/types/models";

function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}" (${inches} in)`;
}

export function renderProfileMarkdown(slug: string, profile: PublicProfileData): string {
  const lines: string[] = [];

  lines.push(`# ${profile.playerName}`);
  lines.push("");
  lines.push(`*Public recruiting profile · ${slug}*`);
  lines.push("");
  if (profile.bio) {
    lines.push(profile.bio);
    lines.push("");
  }

  if (profile.athletic) {
    const a = profile.athletic;
    const items: string[] = [];
    if (a.primary_sport) items.push(`- **Sport:** ${a.primary_sport}`);
    if (a.primary_position) items.push(`- **Primary position:** ${a.primary_position}`);
    if (a.positions?.length) items.push(`- **Positions:** ${a.positions.join(", ")}`);
    if (a.height_inches !== undefined) items.push(`- **Height:** ${formatHeight(a.height_inches)}`);
    if (a.weight_lbs !== undefined) items.push(`- **Weight:** ${a.weight_lbs} lbs`);
    if (a.ncaa_id) items.push(`- **NCAA ID:** ${a.ncaa_id}`);
    if (a.perfect_game_id) items.push(`- **Perfect Game ID:** ${a.perfect_game_id}`);
    if (a.prep_baseball_id) items.push(`- **Prep Baseball ID:** ${a.prep_baseball_id}`);
    if (items.length) {
      lines.push("## Athletic");
      lines.push("");
      lines.push(...items);
      lines.push("");
    }
  }

  if (profile.academics) {
    const ac = profile.academics;
    const items: string[] = [];
    if (ac.high_school) items.push(`- **High school:** ${ac.high_school}`);
    if (ac.graduation_year) items.push(`- **Graduation year:** ${ac.graduation_year}`);
    if (ac.gpa !== undefined) items.push(`- **GPA:** ${ac.gpa}`);
    if (ac.sat_score) items.push(`- **SAT:** ${ac.sat_score}`);
    if (ac.act_score) items.push(`- **ACT:** ${ac.act_score}`);
    if (ac.core_courses?.length) items.push(`- **Core courses:** ${ac.core_courses.join(", ")}`);
    if (items.length) {
      lines.push("## Academics");
      lines.push("");
      lines.push(...items);
      lines.push("");
    }
  }

  if (profile.film?.length) {
    lines.push("## Film");
    lines.push("");
    for (const v of profile.film) {
      const title = v.title ?? v.platform;
      lines.push(`- [${title} (${v.platform})](${v.url})`);
    }
    lines.push("");
  }

  if (profile.schools?.length) {
    lines.push("## Schools of interest");
    lines.push("");
    for (const s of profile.schools) {
      lines.push(`- ${s.name}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(`Source: https://myrecruitingcompass.com/p/${slug}`);
  lines.push("");
  return lines.join("\n");
}
