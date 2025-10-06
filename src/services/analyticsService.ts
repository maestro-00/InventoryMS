import { apiRequest } from '@/hooks/use-api';
import { API_ENDPOINTS } from '@/config/api';

export interface SalesChartData {
  date: string;
  amount: number;
}

export interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface AnalyticsOverview {
  salesTrend: SalesChartData[];
  topItems: TopItem[];
}

/**
 * Get analytics overview (sales trend and top items)
 */
export const getAnalyticsOverview = async (): Promise<{
  data: AnalyticsOverview | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<AnalyticsOverview>(
    API_ENDPOINTS.ANALYTICS.OVERVIEW,
    {
      method: 'GET',
    }
  );

  return { data, error: error || null };
};

/**
 * Get revenue analytics for a date range
 */
export const getRevenueAnalytics = async (
  startDate?: string,
  endDate?: string
): Promise<{
  data: SalesChartData[] | null;
  error: { message: string } | null;
}> => {
  let url = API_ENDPOINTS.ANALYTICS.REVENUE;
  
  if (startDate && endDate) {
    url += `?start_date=${startDate}&end_date=${endDate}`;
  }

  const { data, error } = await apiRequest<SalesChartData[]>(url, {
    method: 'GET',
  });

  return { data, error: error || null };
};

/**
 * Get top selling items
 */
export const getTopItems = async (limit: number = 5): Promise<{
  data: TopItem[] | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<TopItem[]>(
    `${API_ENDPOINTS.ANALYTICS.TOP_ITEMS}?limit=${limit}`,
    {
      method: 'GET',
    }
  );

  return { data, error: error || null };
};
