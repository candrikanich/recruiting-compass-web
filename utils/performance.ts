interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  category: "api" | "component" | "operation";
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();

  start(label: string): void {
    this.marks.set(label, performance.now());
  }

  end(
    label: string,
    category: "api" | "component" | "operation" = "operation",
  ): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn("No start mark found for", label);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.metrics.push({
      name: label,
      duration,
      timestamp: Date.now(),
      category,
    });

    this.marks.delete(label);

    if (duration > 1000) {
      const fixed = duration.toFixed(2);
      console.warn("Slow operation: " + label + " took " + fixed + "ms");
    }

    return duration;
  }

  measure(
    label: string,
    fn: () => void,
    category?: "api" | "component" | "operation",
  ): number {
    this.start(label);
    fn();
    return this.end(label, category);
  }

  async measureAsync(
    label: string,
    fn: () => Promise<void>,
    category?: "api" | "component" | "operation",
  ): Promise<number> {
    this.start(label);
    await fn();
    return this.end(label, category);
  }

  getMetrics(
    category?: "api" | "component" | "operation",
  ): PerformanceMetric[] {
    return category
      ? this.metrics.filter((m) => m.category === category)
      : this.metrics;
  }

  getStats(): {
    total: number;
    average: number;
    min: number;
    max: number;
    byCategory: Record<
      string,
      { count: number; average: number; total: number }
    >;
  } {
    if (this.metrics.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        byCategory: {},
      };
    }

    const durations = this.metrics.map((m) => m.duration);
    const byCategory: Record<
      string,
      { count: number; average: number; total: number }
    > = {};

    this.metrics.forEach((metric) => {
      if (!byCategory[metric.category]) {
        byCategory[metric.category] = { count: 0, average: 0, total: 0 };
      }
      byCategory[metric.category].count += 1;
      byCategory[metric.category].total += metric.duration;
      const count = byCategory[metric.category].count;
      const total = byCategory[metric.category].total;
      byCategory[metric.category].average = total / count;
    });

    return {
      total: this.metrics.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      byCategory,
    };
  }

  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  slowestOperations(count: number = 10): PerformanceMetric[] {
    const sorted = this.metrics.slice().sort((a, b) => b.duration - a.duration);
    return sorted.slice(0, count);
  }

  log(): void {
    const stats = this.getStats();
    console.table({
      "Total Operations": stats.total,
      "Average Duration": stats.average.toFixed(2) + "ms",
      "Min Duration": stats.min.toFixed(2) + "ms",
      "Max Duration": stats.max.toFixed(2) + "ms",
    });

    console.table(stats.byCategory);
  }
}

export const globalMonitor = new PerformanceMonitor();

export const createPerformanceMonitor = () => new PerformanceMonitor();
