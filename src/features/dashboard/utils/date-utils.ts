function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function subDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
}

export type SalesTrendPoint = { label: string; value: number };

function buildDateRange(days: number): { from: string; to: string } {
  const to = startOfDay(new Date());
  const from = subDays(to, days - 1);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function aggregateDailySales(
  rows: Array<{ occurredAt: string; total: string }>,
  days: number,
): SalesTrendPoint[] {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = formatWeekday(subDays(startOfDay(new Date()), i));
    buckets.set(key, 0);
  }

  for (const row of rows) {
    const key = formatWeekday(new Date(row.occurredAt));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + Number(row.total));
    }
  }

  return [...buckets.entries()].map(([label, value]) => ({ label, value }));
}

export { buildDateRange, aggregateDailySales, startOfDay, subDays, formatWeekday };
