import { apiRequest, ApiResponse } from '@/hooks/use-api';
import { API_ENDPOINTS } from '@/config/api';
import { InventoryItemType } from './inventoryTypeService';

export interface RetailStock {
  id: string;
  inventoryItemId: string;
  quantity: number; 
}

export interface UpdateRetailStockData {
  inventoryItemId: string;
  quantity: number;
}

/**
 * Get all retail stock for the current user
 */
export const getRetailStock = async (): Promise<{
  data: RetailStock[] | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<ApiResponse<RetailStock[]>>(API_ENDPOINTS.RETAILSTOCK.LIST, {
    method: 'GET',
  });

  return { data: data.body, error: error || null };
};

/**
 * Get retail stock by inventory item id for the current user
 */
export const getRetailStockByInventoryItemId = async (
  id: string
): Promise<{
  data: RetailStock;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<ApiResponse<RetailStock>>(API_ENDPOINTS.RETAILSTOCK.GETBYINVENTORYITEM(id), {
    method: 'GET',
  });

  return { data: data.body, error: error || null };
};

/**
 * Get a single retail stock by ID
 */
export const getSingleRetailStock = async (id: string): Promise<{
  data: RetailStock | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<RetailStock>(
    API_ENDPOINTS.RETAILSTOCK.GET(id),
    {
      method: 'GET',
    }
  );
  return { data, error: error || null };
};

/**
 * Update an existing retailStock
 */
export const updateRetailStock = async (
  itemData: UpdateRetailStockData
): Promise<{
  data: RetailStock | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<RetailStock>(
    API_ENDPOINTS.RETAILSTOCK.UPDATE,
    {
      method: 'PUT',
      body: itemData,
    }
  );

  return { data, error: error || null };
};

