import { apiRequest, ApiResponse } from '@/hooks/use-api';
import { API_ENDPOINTS } from '@/config/api';

export interface InventoryItemType { 
  id: number;
  name: string; 
}

export interface CreateInventoryItemTypeData {
  name: string; 
}

export type UpdateInventoryItemTypeData = Partial<CreateInventoryItemTypeData>;

/**
 * Get all inventory item types for the current user
 */
export const getInventoryItemTypes = async (): Promise<{
  data: InventoryItemType[] | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<ApiResponse<InventoryItemType[]>>(API_ENDPOINTS.INVENTORYITEM.LIST, {
    method: 'GET',
  });


  return { data: data.body, error: error || null };
};

/**
 * Get a single inventory item type by ID
 */
export const getInventoryItemType = async (id: string): Promise<{
  data: InventoryItemType | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<InventoryItemType>(
    API_ENDPOINTS.INVENTORYITEM.GET(id),
    {
      method: 'GET',
    }
  );
  return { data, error: error || null };
};

/**
 * Create a new inventory item type
 */
export const createInventoryItemType = async (
  itemData: CreateInventoryItemTypeData
): Promise<{
  data: InventoryItemType | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<InventoryItemType>(
    API_ENDPOINTS.INVENTORYITEM.CREATE,
    {
      method: 'POST',
      body: itemData,
    }
  );

  return { data, error: error || null };
};

/**
 * Update an existing inventory item type
 */
export const updateInventoryItemType = async (
  id: string,
  itemData: UpdateInventoryItemTypeData
): Promise<{
  data: InventoryItemType | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<InventoryItemType>(
    API_ENDPOINTS.INVENTORYITEM.UPDATE(id),
    {
      method: 'PUT',
      body: itemData,
    }
  );

  return { data, error: error || null };
};

/**
 * Delete an inventory item type
 */
export const deleteInventoryItemType = async (id: string): Promise<{
  data: { success: boolean } | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<{ success: boolean }>(
    API_ENDPOINTS.INVENTORYITEM.DELETE(id),
    {
      method: 'DELETE',
    }
  );

  return { data, error: error || null };
};

