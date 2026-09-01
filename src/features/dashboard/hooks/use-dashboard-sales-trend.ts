import { useQuery } from "@tanstack/react-query";
import { fetchReport } from "../../reports/api/reports-api";
import { useActiveLocationId } from "../../../shared/location/use-active-location";
import {
  aggregateDailySales,
  buildDateRange,
  type SalesTrendPoint,
} from "../utils/date-utils";

export type { SalesTrendPoint };

export function useDashboardSalesTrend(range: "daily" | "weekly" = "weekly") {
  const locationId = useActiveLocationId();
  const days = range === "daily" ? 1 : 7;

  return useQuery({
    queryKey: ["dashboard-sales-trend", range, locationId],
    queryFn: async () => {
      const { from, to } = buildDateRange(days);
      const report = await fetchReport("sales", {
        from,
        to,
        locationId: locationId || undefined,
      });
      const points = aggregateDailySales(
        report.rows as Array<{ occurredAt: string; total: string }>,
        days,
      );
      const total = points.reduce((sum, point) => sum + point.value, 0);
      return { points, total };
    },
    staleTime: 60_000,
  });
}
