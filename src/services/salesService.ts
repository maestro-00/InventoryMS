import { apiRequest } from '@/hooks/use-api';
import { API_ENDPOINTS } from '@/config/api';

export interface Sale {
  id: string;
  user_id: string;
  total_amount: number;
  payment_method: string;
  customer_name: string | null;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  item_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  item_name?: string;
}

export interface CreateSaleData {
  total_amount: number;
  payment_method: string;
  customer_name?: string | null;
  items: {
    item_id: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
}

export interface SalesStats {
  totalItems: number;
  lowStock: number;
  todaySales: number;
  totalRevenue: number;
}

/**
 * Get all sales for the current user
 */
export const getSales = async (): Promise<{
  data: Sale[] | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<Sale[]>(API_ENDPOINTS.SALES.LIST, {
    method: 'GET',
  });

  return { data, error: error || null };
};

/**
 * Get a single sale by ID
 */
export const getSale = async (id: string): Promise<{
  data: Sale | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<Sale>(
    API_ENDPOINTS.SALES.GET(id),
    {
      method: 'GET',
    }
  );

  return { data, error: error || null };
};

/**
 * Create a new sale
 */
export const createSale = async (
  saleData: CreateSaleData
): Promise<{
  data: Sale | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<Sale>(
    API_ENDPOINTS.SALES.CREATE,
    {
      method: 'POST',
      body: saleData,
    }
  );

  return { data, error: error || null };
};

/**
 * Get sales statistics
 */
export const getSalesStats = async (): Promise<{
  data: SalesStats | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<SalesStats>(
    API_ENDPOINTS.SALES.STATS,
    {
      method: 'GET',
    }
  );

  return { data, error: error || null };
};

/**
 * Get today's sales
 */
export const getTodaySales = async (): Promise<{
  data: Sale[] | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<Sale[]>(
    API_ENDPOINTS.SALES.TODAY,
    {
      method: 'GET',
    }
  );

  return { data, error: error || null };
};

/**
 * Get sales by date range
 */
export const getSalesByDateRange = async (
  startDate: string,
  endDate: string
): Promise<{
  data: Sale[] | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<Sale[]>(
    `${API_ENDPOINTS.SALES.LIST}?start_date=${startDate}&end_date=${endDate}`,
    {
      method: 'GET',
    }
  );

  return { data, error: error || null };
};

/**
 * Calculate total revenue
 */
export const calculateTotalRevenue = (sales: Sale[]): number => {
  return sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
};

/**
 * Calculate today's revenue
 */
export const calculateTodayRevenue = (sales: Sale[]): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySales = sales.filter((sale) => {
    const saleDate = new Date(sale.created_at);
    saleDate.setHours(0, 0, 0, 0);
    return saleDate.getTime() === today.getTime();
  });

  return calculateTotalRevenue(todaySales);
};
