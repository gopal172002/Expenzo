import { useQuery } from "@tanstack/react-query";
import { adminApi, type AggregatedAnalyticsResponse } from "../api/adminApi";
import { employeeApi } from "../api/employeeApi";
import { windowRange, type InsightPeriodDays } from "../utils/insightSeries";

export type InsightPortal = "admin" | "employee";

async function fetchWindow(portal: InsightPortal, start: string, end: string, bucket: "daily" | "weekly" | "monthly") {
  if (portal === "employee") {
    return employeeApi.getAggregated(start, end, bucket);
  }
  return adminApi.getAnalyticsAggregated({
    startDate: start,
    endDate: end,
    timelineBucket: bucket,
  });
}

export function useInsightAnalytics(portal: InsightPortal, days: InsightPeriodDays) {
  return useQuery({
    queryKey: ["insight-analytics", portal, days],
    queryFn: async (): Promise<{ current: AggregatedAnalyticsResponse; previous: AggregatedAnalyticsResponse }> => {
      const { start, end, prevStart, prevEnd, bucket } = windowRange(days);
      const [current, previous] = await Promise.all([
        fetchWindow(portal, start, end, bucket),
        fetchWindow(portal, prevStart, prevEnd, bucket),
      ]);
      return { current, previous };
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
