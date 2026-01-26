/**
 * Recruiting Packet Export Utility
 * Generates professional HTML for recruiter-ready recruiting packets with athlete profile and school information
 */

import type { User, School } from "~/types/models";

/**
 * Athlete data aggregated from multiple sources for recruiting packet
 */
export interface RecruitingPacketData {
  athlete: AthletePacketData;
  schools: SchoolGroupedByPriority;
  activitySummary: ActivitySummary;
}

export interface AthletePacketData extends Partial<User> {
  height?: string;
  weight?: string;
  position?: string;
  high_school?: string;
  graduation_year?: number;
  gpa?: number;
  sat_score?: number;
  act_score?: number;
  video_links?: VideoLink[];
  social_media?: SocialMediaHandle[];
  core_courses?: string[];
}

export interface VideoLink {
  platform: "hudl" | "youtube" | "vimeo";
  url: string;
  title?: string;
}

export interface SocialMediaHandle {
  platform: "instagram" | "twitter" | "tiktok";
  handle: string;
  url?: string;
}

export interface SchoolGroupedByPriority {
  tier_a: SchoolPacketData[];
  tier_b: SchoolPacketData[];
  tier_c: SchoolPacketData[];
}

export interface SchoolPacketData extends Partial<School> {
  fitScore?: number;
  coachCount?: number;
  interactionCount?: number;
}

export interface ActivitySummary {
  totalSchools: number;
  totalInteractions: number;
  recentContact?: Date;
  interactionBreakdown: {
    emails: number;
    calls: number;
    camps: number;
    visits: number;
    other: number;
  };
}

/**
 * Generate filename for recruiting packet PDF
 */
export const generatePacketFilename = (athleteName: string): string => {
  const sanitized = athleteName
    .trim()
    .replace(/[^a-zA-Z\s]/g, "")
    .replace(/\s+/g, "_");
  const date = new Date().toISOString().split("T")[0];
  return `${sanitized}_RecruitingPacket_${date}.pdf`;
};

/**
 * Render professional CSS for recruiting packet
 */
export const getRecruitingPacketStyles = (): string => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    color: #1a1a1a;
    line-height: 1.6;
    background: #fff;
  }

  /* Page Layout */
  .packet-container {
    max-width: 900px;
    margin: 0 auto;
    background: white;
  }

  .page {
    min-height: 11in;
    padding: 0.5in;
    margin: 0 0 0.5in 0;
    page-break-after: always;
    background: white;
  }

  .page:last-child {
    margin-bottom: 0;
  }

  /* Cover Page */
  .cover-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    background: linear-gradient(135deg, #1e293b 0%, #3b82f6 100%);
    color: white;
    padding: 2in 0.5in;
  }

  .cover-page .profile-photo {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid white;
    margin-bottom: 1.5in;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }

  .cover-page .athlete-name {
    font-size: 48px;
    font-weight: 700;
    margin-bottom: 0.3in;
    letter-spacing: -1px;
  }

  .cover-page .athlete-details {
    font-size: 18px;
    margin-bottom: 0.2in;
    opacity: 0.95;
  }

  .cover-page .athlete-position {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 1in;
  }

  .cover-page .generation-date {
    font-size: 12px;
    opacity: 0.7;
    margin-top: auto;
  }

  /* Headers */
  h1 {
    font-size: 32px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.3in;
    border-bottom: 3px solid #3b82f6;
    padding-bottom: 0.2in;
  }

  h2 {
    font-size: 22px;
    font-weight: 600;
    color: #1e293b;
    margin-top: 0.3in;
    margin-bottom: 0.2in;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #334155;
    margin-top: 0.2in;
    margin-bottom: 0.1in;
  }

  /* Profile Section */
  .profile-section {
    padding: 0.3in;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.2in;
    margin: 0.3in 0;
  }

  .stat-card {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    padding: 0.2in;
    border-radius: 6px;
    text-align: center;
    border: 1px solid #bae6fd;
  }

  .stat-card .value {
    font-size: 24px;
    font-weight: 700;
    color: #0369a1;
  }

  .stat-card .label {
    font-size: 11px;
    color: #0c4a6e;
    margin-top: 0.05in;
  }

  /* Contact Info */
  .contact-info {
    background: #f8fafc;
    padding: 0.2in;
    border-radius: 6px;
    margin: 0.2in 0;
    font-size: 12px;
  }

  .contact-info-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.15in;
    margin-bottom: 0.05in;
  }

  .contact-info-row:last-child {
    margin-bottom: 0;
  }

  .info-label {
    font-weight: 600;
    color: #334155;
  }

  .info-value {
    color: #475569;
    word-break: break-all;
  }

  /* Video Links */
  .video-links {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.1in;
    margin: 0.2in 0;
  }

  .video-link {
    background: #fef3c7;
    padding: 0.1in;
    border-radius: 4px;
    font-size: 12px;
    text-align: center;
    border: 1px solid #fcd34d;
  }

  .video-link a {
    color: #b45309;
    text-decoration: none;
    font-weight: 600;
  }

  /* Schools Section */
  .schools-section {
    padding: 0.3in;
  }

  .school-tier {
    margin-bottom: 0.3in;
  }

  .school-tier-title {
    font-size: 16px;
    font-weight: 600;
    color: white;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    padding: 0.1in 0.15in;
    border-radius: 4px;
    margin-bottom: 0.1in;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.15in 0;
    font-size: 11px;
  }

  thead tr {
    background: #f1f5f9;
  }

  th {
    padding: 0.1in;
    text-align: left;
    font-weight: 600;
    color: #1e293b;
    border-bottom: 2px solid #cbd5e1;
  }

  td {
    padding: 0.1in;
    border-bottom: 1px solid #e2e8f0;
  }

  tbody tr:nth-child(odd) {
    background: #f8fafc;
  }

  tbody tr:nth-child(even) {
    background: white;
  }

  /* Status Badges */
  .badge {
    display: inline-block;
    padding: 0.05in 0.1in;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  .badge-green {
    background: #d1fae5;
    color: #065f46;
  }

  .badge-blue {
    background: #dbeafe;
    color: #1e40af;
  }

  .badge-yellow {
    background: #fef3c7;
    color: #92400e;
  }

  .badge-red {
    background: #fee2e2;
    color: #991b1b;
  }

  .badge-gray {
    background: #f3f4f6;
    color: #374151;
  }

  /* Activity Summary */
  .activity-summary {
    padding: 0.3in;
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.2in;
    margin: 0.2in 0;
  }

  .summary-card {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    padding: 0.15in;
    border-radius: 6px;
    text-align: center;
    border: 1px solid #bbf7d0;
  }

  .summary-card .value {
    font-size: 28px;
    font-weight: 700;
    color: #16a34a;
  }

  .summary-card .label {
    font-size: 11px;
    color: #15803d;
    margin-top: 0.05in;
  }

  /* Interaction Breakdown */
  .interaction-breakdown {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.1in;
    margin: 0.2in 0;
  }

  .breakdown-item {
    background: #f1f5f9;
    padding: 0.1in;
    border-radius: 4px;
    text-align: center;
    font-size: 11px;
  }

  .breakdown-item .count {
    font-size: 20px;
    font-weight: 700;
    color: #3b82f6;
  }

  .breakdown-item .label {
    font-size: 10px;
    color: #475569;
    margin-top: 0.05in;
  }

  /* Footer */
  .footer {
    font-size: 10px;
    color: #64748b;
    text-align: center;
    padding-top: 0.2in;
    border-top: 1px solid #e2e8f0;
    margin-top: 0.3in;
  }

  /* Print Optimizations */
  @media print {
    body {
      margin: 0;
      padding: 0;
    }

    .page {
      margin: 0;
      padding: 0.5in;
      page-break-after: always;
    }

    .no-print {
      display: none !important;
    }

    h1, h2, h3 {
      page-break-after: avoid;
    }

    table {
      page-break-inside: avoid;
    }

    .stat-card,
    .summary-card,
    .school-tier {
      page-break-inside: avoid;
    }
  }
`;

/**
 * Render cover page with athlete photo and basic info
 */
const renderCoverPage = (athlete: AthletePacketData): string => {
  const photoHtml = athlete.profile_photo_url
    ? `<img src="${athlete.profile_photo_url}" alt="Profile" class="profile-photo" />`
    : "<div class='profile-photo' style='background: rgba(255,255,255,0.2);'></div>";

  return `
    <div class="page cover-page">
      ${photoHtml}
      <div class="athlete-name">${athlete.full_name || "Athlete Name"}</div>
      ${athlete.position ? `<div class="athlete-position">${athlete.position}</div>` : ""}
      <div class="athlete-details">
        ${athlete.high_school ? `${athlete.high_school}` : ""}
        ${athlete.graduation_year ? ` • Class of ${athlete.graduation_year}` : ""}
      </div>
      <div class="generation-date">Generated on ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</div>
    </div>
  `;
};

/**
 * Render athlete profile section with stats and academics
 */
const renderAthleteProfile = (athlete: AthletePacketData): string => {
  return `
    <div class="page profile-section">
      <h1>Athlete Profile</h1>

      <div class="stats-grid">
        ${athlete.height ? `<div class="stat-card"><div class="value">${athlete.height}</div><div class="label">Height</div></div>` : ""}
        ${athlete.weight ? `<div class="stat-card"><div class="value">${athlete.weight}</div><div class="label">Weight</div></div>` : ""}
        ${athlete.gpa ? `<div class="stat-card"><div class="value">${athlete.gpa.toFixed(2)}</div><div class="label">GPA</div></div>` : ""}
        ${athlete.position ? `<div class="stat-card"><div class="value">${athlete.position}</div><div class="label">Position</div></div>` : ""}
      </div>

      <h2>Contact Information</h2>
      <div class="contact-info">
        <div class="contact-info-row">
          <div><span class="info-label">Email:</span> <span class="info-value">${athlete.email || "Not provided"}</span></div>
          <div><span class="info-label">Phone:</span> <span class="info-value">Available upon request</span></div>
        </div>
      </div>

      ${
        athlete.gpa || athlete.sat_score || athlete.act_score || athlete.core_courses
          ? `
        <h2>Academic Information</h2>
        <div class="contact-info">
          ${athlete.gpa ? `<div class="contact-info-row"><div><span class="info-label">GPA:</span></div><div><span class="info-value">${athlete.gpa.toFixed(2)}</span></div></div>` : ""}
          ${athlete.sat_score ? `<div class="contact-info-row"><div><span class="info-label">SAT:</span></div><div><span class="info-value">${athlete.sat_score}</span></div></div>` : ""}
          ${athlete.act_score ? `<div class="contact-info-row"><div><span class="info-label">ACT:</span></div><div><span class="info-value">${athlete.act_score}</span></div></div>` : ""}
          ${athlete.core_courses && athlete.core_courses.length > 0 ? `<div class="contact-info-row"><div><span class="info-label">Core Courses:</span></div><div><span class="info-value">${athlete.core_courses.join(", ")}</span></div></div>` : ""}
        </div>
      `
          : ""
      }

      ${
        athlete.video_links && athlete.video_links.length > 0
          ? `
        <h2>Video Links</h2>
        <div class="video-links">
          ${athlete.video_links
            .map(
              (v) => `
            <div class="video-link">
              <a href="${v.url}" target="_blank">${v.title || v.platform.toUpperCase()}</a>
            </div>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }
    </div>
  `;
};

/**
 * Render schools section grouped by priority tier
 */
const renderSchoolsSection = (schools: SchoolGroupedByPriority): string => {
  const renderSchoolTier = (tier: SchoolPacketData[], tierName: string): string => {
    if (tier.length === 0) return "";

    return `
      <div class="school-tier">
        <div class="school-tier-title">${tierName} Schools (${tier.length})</div>
        <table>
          <thead>
            <tr>
              <th>School Name</th>
              <th>Location</th>
              <th>Division</th>
              <th>Conference</th>
              <th>Status</th>
              ${tier.some((s) => s.fitScore) ? "<th>Fit Score</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${tier
              .map(
                (school) => `
              <tr>
                <td><strong>${school.name || "-"}</strong></td>
                <td>${school.location || "-"}</td>
                <td>${school.division || "-"}</td>
                <td>${school.conference || "-"}</td>
                <td>${getStatusBadge(school.status || "researching")}</td>
                ${school.fitScore ? `<td>${school.fitScore}%</td>` : ""}
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  return `
    <div class="page schools-section">
      <h1>Schools of Interest</h1>
      ${renderSchoolTier(schools.tier_a, "Priority A")}
      ${renderSchoolTier(schools.tier_b, "Priority B")}
      ${renderSchoolTier(schools.tier_c, "Priority C")}
    </div>
  `;
};

/**
 * Render activity summary with interaction breakdown
 */
const renderActivitySummary = (summary: ActivitySummary): string => {
  return `
    <div class="page activity-summary">
      <h1>Activity Summary</h1>

      <div class="summary-stats">
        <div class="summary-card">
          <div class="value">${summary.totalSchools}</div>
          <div class="label">Total Schools</div>
        </div>
        <div class="summary-card">
          <div class="value">${summary.totalInteractions}</div>
          <div class="label">Total Interactions</div>
        </div>
        <div class="summary-card">
          <div class="value">${summary.recentContact ? new Date(summary.recentContact).toLocaleDateString() : "N/A"}</div>
          <div class="label">Recent Contact</div>
        </div>
      </div>

      <h2>Interaction Breakdown</h2>
      <div class="interaction-breakdown">
        <div class="breakdown-item">
          <div class="count">${summary.interactionBreakdown.emails}</div>
          <div class="label">Emails</div>
        </div>
        <div class="breakdown-item">
          <div class="count">${summary.interactionBreakdown.calls}</div>
          <div class="label">Calls</div>
        </div>
        <div class="breakdown-item">
          <div class="count">${summary.interactionBreakdown.camps}</div>
          <div class="label">Camps</div>
        </div>
        <div class="breakdown-item">
          <div class="count">${summary.interactionBreakdown.visits}</div>
          <div class="label">Visits</div>
        </div>
        <div class="breakdown-item">
          <div class="count">${summary.interactionBreakdown.other}</div>
          <div class="label">Other</div>
        </div>
      </div>

      <div class="footer">
        <p>This recruiting packet was generated by The Recruiting Compass.</p>
        <p>Generated on ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}</p>
      </div>
    </div>
  `;
};

/**
 * Status badge formatter
 */
const getStatusBadge = (status: string): string => {
  const badges: Record<string, string> = {
    interested: '<span class="badge badge-blue">Interested</span>',
    contacted: '<span class="badge badge-blue">Contacted</span>',
    camp_invite: '<span class="badge badge-yellow">Camp Invite</span>',
    recruited: '<span class="badge badge-green">Recruited</span>',
    official_visit_invited: '<span class="badge badge-yellow">Visit Invited</span>',
    official_visit_scheduled: '<span class="badge badge-yellow">Visit Scheduled</span>',
    offer_received: '<span class="badge badge-green">Offer</span>',
    committed: '<span class="badge badge-green">Committed</span>',
    declined: '<span class="badge badge-red">Declined</span>',
    researching: '<span class="badge badge-gray">Researching</span>',
  };
  return badges[status] || `<span class="badge badge-gray">${status}</span>`;
};

/**
 * Generate complete recruiting packet HTML
 */
export const generateRecruitingPacketHTML = (data: RecruitingPacketData): string => {
  const styles = getRecruitingPacketStyles();

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Recruiting Packet - ${data.athlete.full_name}</title>
      <style>
        ${styles}
      </style>
    </head>
    <body>
      <div class="packet-container">
        ${renderCoverPage(data.athlete)}
        ${renderAthleteProfile(data.athlete)}
        ${renderSchoolsSection(data.schools)}
        ${renderActivitySummary(data.activitySummary)}
      </div>
      <div class="no-print" style="text-align: center; padding: 1in 0; background: #f0f4f8;">
        <button onclick="window.print()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
          📥 Download as PDF
        </button>
      </div>
    </body>
    </html>
  `;

  return html;
};
