// scripts/lhci-slack-report.js
import fs from "fs";
import https from "https";
import path from "path";

/**
 * @param {number} score  0–100 integer
 * @returns {string}
 */
export function getScoreEmoji(score) {
  if (score >= 90) return "🟢";
  if (score >= 75) return "🟡";
  return "🔴";
}

/**
 * @param {string} url  Full URL (e.g. https://staging.vercel.app/dashboard)
 * @param {Record<string, number>} summary  LHCI summary values (0–1 decimals)
 * @returns {string}
 */
export function formatRow(url, summary) {
  const pathname = new URL(url).pathname;
  const perf = Math.round((summary["performance"] ?? 0) * 100);
  const a11y = Math.round((summary["accessibility"] ?? 0) * 100);
  const bp = Math.round((summary["best-practices"] ?? 0) * 100);
  const seo = summary["seo"] != null ? Math.round(summary["seo"] * 100) : null;

  const seoStr = seo != null ? `${getScoreEmoji(seo)} ${seo}` : "n/a";

  return (
    `\`${pathname.padEnd(20)}\`` +
    `  Perf: ${getScoreEmoji(perf)} ${String(perf).padStart(3)}` +
    `  A11y: ${getScoreEmoji(a11y)} ${String(a11y).padStart(3)}` +
    `  BP: ${getScoreEmoji(bp)} ${String(bp).padStart(3)}` +
    `  SEO: ${seoStr}`
  );
}

/**
 * @param {Array<{url: string, summary: Record<string, number>}>} entries
 * @param {string} commitSha
 * @param {string} runUrl
 * @returns {{ text: string, blocks: object[] }}
 */
export function buildSlackPayload(entries, commitSha, runUrl) {
  const shortSha = commitSha.slice(0, 7);
  const rows = entries.map((e) => formatRow(e.url, e.summary)).join("\n");

  return {
    text: `Lighthouse CI — staging/${shortSha}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Lighthouse CI — staging/${shortSha}*\n\`\`\`\n${rows}\n\`\`\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${runUrl}|Full reports →>`,
        },
      },
    ],
  };
}

/**
 * @param {string} webhookUrl
 * @param {object} payload
 * @returns {Promise<void>}
 */
function postToSlack(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(webhookUrl);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        res.resume();
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve();
          else
            reject(new Error(`Slack webhook returned HTTP ${res.statusCode}`));
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Only run main() when executed directly (not when imported by tests)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const manifestPath = path.join(".lighthouseci", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const representative = manifest.filter((e) => e.isRepresentativeRun);

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("SLACK_WEBHOOK_URL not set — skipping Slack notification");
    process.exit(0);
  }

  const commitSha = process.env.GITHUB_SHA ?? "unknown";
  const serverUrl = process.env.GITHUB_SERVER_URL ?? "";
  const repo = process.env.GITHUB_REPOSITORY ?? "";
  const runId = process.env.GITHUB_RUN_ID ?? "";
  const runUrl = `${serverUrl}/${repo}/actions/runs/${runId}`;

  const payload = buildSlackPayload(representative, commitSha, runUrl);
  postToSlack(webhookUrl, payload)
    .then(() => console.log("Slack notification sent"))
    .catch((err) => {
      console.error("Failed to post to Slack:", err.message);
      process.exit(1);
    });
}
