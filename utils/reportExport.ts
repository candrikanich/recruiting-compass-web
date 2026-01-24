import type {
  School,
  Coach,
  Interaction,
  PerformanceMetric,
} from "~/types/models";

export interface ReportData {
  title: string;
  dateRange: {
    from: string;
    to: string;
  };
  schools?: {
    total: number;
    byStatus: Record<string, number>;
    byDivision: Record<string, number>;
  };
  coaches?: {
    total: number;
    avgResponseRate: number;
    bySchool: number;
  };
  interactions?: {
    total: number;
    byType: Record<string, number>;
    bySentiment: Record<string, number>;
  };
  metrics?: {
    total: number;
    byType: Record<string, number>;
    summaries: Array<{
      type: string;
      avg: number;
      max: number;
      min: number;
    }>;
  };
  generatedAt: string;
}

export const generateReportData = (
  schools: School[],
  coaches: Coach[],
  interactions: Interaction[],
  metrics: PerformanceMetric[],
  from: string,
  to: string,
): ReportData => {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  const filteredInteractions = interactions.filter((i) => {
    const date = i.occurred_at ? new Date(i.occurred_at) : new Date();
    return date >= fromDate && date <= toDate;
  });

  const filteredMetrics = metrics.filter((m) => {
    const date = new Date(m.recorded_date);
    return date >= fromDate && date <= toDate;
  });

  // Calculate interaction stats
  const interactionsByType = {} as Record<string, number>;
  const interactionsBySentiment = {} as Record<string, number>;

  filteredInteractions.forEach((i) => {
    interactionsByType[i.type] = (interactionsByType[i.type] || 0) + 1;
    if (i.sentiment) {
      interactionsBySentiment[i.sentiment] =
        (interactionsBySentiment[i.sentiment] || 0) + 1;
    }
  });

  // Calculate school stats
  const schoolsByStatus = {} as Record<string, number>;
  const schoolsByDivision = {} as Record<string, number>;

  schools.forEach((s) => {
    schoolsByStatus[s.status] = (schoolsByStatus[s.status] || 0) + 1;
    if (s.division) {
      schoolsByDivision[s.division] = (schoolsByDivision[s.division] || 0) + 1;
    }
  });

  // Calculate coach stats
  const coachResponseRates = coaches
    .filter((c) => c.responsiveness_score !== undefined)
    .map((c) => c.responsiveness_score || 0);
  const avgResponseRate =
    coachResponseRates.length > 0
      ? coachResponseRates.reduce((a, b) => a + b, 0) /
        coachResponseRates.length
      : 0;

  // Calculate metric stats
  const metricsByType = {} as Record<string, number>;
  const metricSummaries: Array<{
    type: string;
    avg: number;
    max: number;
    min: number;
  }> = [];

  const metricsGrouped = {} as Record<string, number[]>;

  filteredMetrics.forEach((m) => {
    metricsByType[m.metric_type] = (metricsByType[m.metric_type] || 0) + 1;
    if (!metricsGrouped[m.metric_type]) {
      metricsGrouped[m.metric_type] = [];
    }
    metricsGrouped[m.metric_type].push(m.value);
  });

  Object.entries(metricsGrouped).forEach(([type, values]) => {
    metricSummaries.push({
      type,
      avg:
        values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0,
      max: Math.max(...values),
      min: Math.min(...values),
    });
  });

  return {
    title: "Baseball Recruiting Report",
    dateRange: { from, to },
    schools: {
      total: schools.length,
      byStatus: schoolsByStatus,
      byDivision: schoolsByDivision,
    },
    coaches: {
      total: coaches.length,
      avgResponseRate: Math.round(avgResponseRate * 100) / 100,
      bySchool: schools.length,
    },
    interactions: {
      total: filteredInteractions.length,
      byType: interactionsByType,
      bySentiment: interactionsBySentiment,
    },
    metrics: {
      total: filteredMetrics.length,
      byType: metricsByType,
      summaries: metricSummaries,
    },
    generatedAt: new Date().toISOString(),
  };
};

export const exportReportToCSV = (report: ReportData): string => {
  const lines = [] as string[];

  lines.push('"' + report.title + '"');
  lines.push('"Report Date: ' + report.generatedAt + '"');
  lines.push(
    '"Date Range: ' +
      report.dateRange.from +
      " to " +
      report.dateRange.to +
      '"',
  );
  lines.push("");

  // Schools Summary
  lines.push('"Schools Summary"');
  lines.push('"Total Schools",' + (report.schools?.total || 0));
  if (report.schools?.byStatus) {
    lines.push(",,By Status");
    Object.entries(report.schools.byStatus).forEach(([status, count]) => {
      lines.push(',"' + status + '",' + count);
    });
  }
  lines.push("");

  // Coaches Summary
  lines.push('"Coaches Summary"');
  lines.push('"Total Coaches",' + (report.coaches?.total || 0));
  lines.push(
    '"Average Response Rate",' + (report.coaches?.avgResponseRate || 0),
  );
  lines.push("");

  // Interactions Summary
  lines.push('"Interactions Summary"');
  lines.push('"Total Interactions",' + (report.interactions?.total || 0));
  if (report.interactions?.byType) {
    lines.push(",,By Type");
    Object.entries(report.interactions.byType).forEach(([type, count]) => {
      lines.push(',"' + type + '",' + count);
    });
  }
  lines.push("");

  // Metrics Summary
  lines.push('"Performance Metrics Summary"');
  lines.push('"Total Metrics",' + (report.metrics?.total || 0));
  if (report.metrics?.summaries) {
    lines.push(",,Metric,Average,Max,Min");
    report.metrics.summaries.forEach((m) => {
      lines.push(
        ',"","' + m.type + '",' + m.avg.toFixed(2) + "," + m.max + "," + m.min,
      );
    });
  }

  return lines.join("\n");
};

export const downloadReport = (filename: string, content: string) => {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(content),
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
