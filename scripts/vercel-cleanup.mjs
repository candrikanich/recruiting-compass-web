#!/usr/bin/env node
/**
 * Prunes old Vercel deployments for a project, keeping the N most recent
 * per git branch and never touching anything with a live alias (custom
 * domain, production, or a preview alias someone still has bookmarked).
 *
 * Dry-run by default — prints what it WOULD delete. Pass --execute to
 * actually delete.
 *
 * Usage:
 *   VERCEL_TOKEN=xxx node scripts/vercel-cleanup.mjs [options]
 *
 * Options:
 *   --project <name|id>   Vercel project (default: recruiting-compass-web)
 *   --team <slug|id>      Vercel team (default: the-recruiting-compass)
 *   --keep <n>            Deployments to keep per branch regardless of age (default: 5)
 *   --older-than <days>   Also delete anything past this age, beyond the --keep floor (default: none)
 *   --execute             Actually delete (default: dry-run)
 */

const API = "https://api.vercel.com";
const DAY_MS = 24 * 60 * 60 * 1000;

function parseArgs(argv) {
  const opts = {
    project: "recruiting-compass-web",
    team: "the-recruiting-compass",
    keep: 5,
    olderThanDays: null,
    execute: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--project") opts.project = argv[++i];
    else if (arg === "--team") opts.team = argv[++i];
    else if (arg === "--keep") opts.keep = Number(argv[++i]);
    else if (arg === "--older-than") opts.olderThanDays = Number(argv[++i]);
    else if (arg === "--execute") opts.execute = true;
    else throw new Error(`Unknown arg: ${arg}`);
  }
  return opts;
}

function requireToken() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error(
      "VERCEL_TOKEN not set. Create one at https://vercel.com/account/tokens and export it.",
    );
  }
  return token;
}

async function vercelFetch(token, path, teamId) {
  const url = new URL(`${API}${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function resolveTeamId(token, teamSlugOrId) {
  if (teamSlugOrId.startsWith("team_")) return teamSlugOrId;
  const { teams } = await vercelFetch(token, "/v2/teams");
  const team = teams.find((t) => t.slug === teamSlugOrId || t.id === teamSlugOrId);
  if (!team) throw new Error(`Team not found: ${teamSlugOrId}`);
  return team.id;
}

async function resolveProjectId(token, teamId, projectNameOrId) {
  const { projects } = await vercelFetch(token, "/v10/projects", teamId);
  const project = projects.find((p) => p.name === projectNameOrId || p.id === projectNameOrId);
  if (!project) throw new Error(`Project not found: ${projectNameOrId}`);
  return project.id;
}

async function fetchAllDeployments(token, teamId, projectId) {
  const deployments = [];
  let until;
  for (;;) {
    const path = `/v6/deployments?projectId=${projectId}&limit=100${until ? `&until=${until}` : ""}`;
    const data = await vercelFetch(token, path, teamId);
    deployments.push(...data.deployments);
    if (!data.pagination?.next) break;
    until = data.pagination.next;
  }
  return deployments;
}

async function fetchAliasedDeploymentIds(token, teamId) {
  const { aliases } = await vercelFetch(token, "/v4/aliases?limit=100", teamId);
  return new Set(aliases.map((a) => a.deploymentId));
}

function groupByBranch(deployments) {
  const byBranch = new Map();
  for (const d of deployments) {
    const branch = d.meta?.githubCommitRef ?? "(no-branch)";
    if (!byBranch.has(branch)) byBranch.set(branch, []);
    byBranch.get(branch).push(d);
  }
  for (const list of byBranch.values()) {
    list.sort((a, b) => b.created - a.created);
  }
  return byBranch;
}

const sleep = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

async function deleteDeployment(token, teamId, id) {
  const url = new URL(`${API}/v13/deployments/${id}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  for (;;) {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 404) return;
    if (res.status === 429) {
      const body = await res.json().catch(() => null);
      const resetMs = body?.error?.limit?.reset ? body.error.limit.reset - Date.now() : 60_000;
      const waitMs = Math.max(resetMs, 5000) + 2000; // small buffer past reset
      console.log(`  rate limited, waiting ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
      continue;
    }
    throw new Error(`delete ${id} -> ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const token = requireToken();

  const teamId = await resolveTeamId(token, opts.team);
  const projectId = await resolveProjectId(token, teamId, opts.project);

  const [deployments, aliasedIds] = await Promise.all([
    fetchAllDeployments(token, teamId, projectId),
    fetchAliasedDeploymentIds(token, teamId),
  ]);

  const cutoff = opts.olderThanDays != null ? Date.now() - opts.olderThanDays * DAY_MS : null;

  const byBranch = groupByBranch(deployments);
  const toDelete = [];

  for (const [branch, list] of byBranch) {
    const candidates = list.slice(opts.keep); // never touch the newest N per branch
    for (const d of candidates) {
      if (aliasedIds.has(d.uid ?? d.id)) continue; // never delete anything aliased
      if (cutoff != null && d.created > cutoff) continue; // not old enough yet
      toDelete.push({ branch, ...d });
    }
  }

  const ageDesc = cutoff != null ? ` older than ${opts.olderThanDays}d` : "";
  console.log(
    `${opts.project}: ${deployments.length} deployments across ${byBranch.size} branches. ` +
      `Keeping ${opts.keep}/branch + all aliased. ${toDelete.length} eligible for deletion${ageDesc}.`,
  );

  for (const d of toDelete) {
    console.log(`  ${opts.execute ? "DELETE" : "would delete"}  ${d.branch}  ${d.url}  (${new Date(d.created).toISOString()})`);
  }

  if (!opts.execute) {
    console.log("\nDry run. Re-run with --execute to actually delete.");
    return;
  }

  for (const d of toDelete) {
    await deleteDeployment(token, teamId, d.uid ?? d.id);
  }
  console.log(`\nDeleted ${toDelete.length} deployments.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
