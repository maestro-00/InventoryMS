import { apiRequest, ApiResponse } from '@/hooks/use-api';
import { API_ENDPOINTS } from '@/config/api';
import { InventoryItemType } from './inventoryTypeService';

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number; 
  totalAmount: number;
  reOrderLevel: number;
  image_url: string | null;
  type: InventoryItemType;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemData {
  name: string;
  description?: string | null;
  sku?: string | null;
  price: number;
  retailQuantity?: number | null;
  totalAmount: number;
  typeId: number;
  reOrderLevel: number; 
  image_url?: string | null;
}

export type UpdateInventoryItemData = Partial<CreateInventoryItemData>;

/**
 * Get all inventory items for the current user
 */
export const getInventoryItems = async (): Promise<{
  data: InventoryItem[] | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<ApiResponse<InventoryItem[]>>(API_ENDPOINTS.INVENTORY.LIST, {
    method: 'GET',
  });


  return { data: data.body, error: error || null };
};

/**
 * Get a single inventory item by ID
 */
export const getInventoryItem = async (id: string): Promise<{
  data: InventoryItem | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<InventoryItem>(
    API_ENDPOINTS.INVENTORY.GET(id),
    {
      method: 'GET',
    }
  );
  return { data, error: error || null };
};

/**
 * Create a new inventory item
 */
export const createInventoryItem = async (
  itemData: CreateInventoryItemData
): Promise<{
  data: InventoryItem | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<InventoryItem>(
    API_ENDPOINTS.INVENTORY.CREATE + `?retailQuantity=${itemData.retailQuantity}`,
    {
      method: 'POST',
      body: itemData,
    }
  );

  return { data, error: error || null };
};

/**
 * Update an existing inventory item
 */
export const updateInventoryItem = async (
  id: string,
  itemData: UpdateInventoryItemData
): Promise<{
  data: InventoryItem | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<InventoryItem>(
    API_ENDPOINTS.INVENTORY.UPDATE(id) + `?retailQuantity=${itemData.retailQuantity}`,
    {
      method: 'PUT',
      body: itemData,
    }
  );

  return { data, error: error || null };
};

/**
 * Delete an inventory item
 */
export const deleteInventoryItem = async (id: string): Promise<{
  data: { success: boolean } | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<{ success: boolean }>(
    API_ENDPOINTS.INVENTORY.DELETE(id),
    {
      method: 'DELETE',
    }
  );

  return { data, error: error || null };
};

/**
 * Upload an image for an inventory item
 */
export const uploadInventoryImage = async (file: File): Promise<{
  data: { url: string } | null;
  error: { message: string } | null;
}> => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${API_ENDPOINTS.INVENTORY.UPLOAD_IMAGE}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        data: null,
        error: { message: errorData.message || 'Failed to upload image' },
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Failed to upload image' },
    };
  }
};

/**
 * Get low stock items (quantity < reOrderLevel)
 */
export const getLowStockItems = async (): Promise<{
  data: InventoryItem[] | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await getInventoryItems();

  if (error || !data) {
    return { data: null, error };
  }

  const lowStockItems = data.filter(
    (item) => item.totalAmount < item.reOrderLevel
  );

  return { data: lowStockItems, error: null };
};

/**
 * Update inventory quantity (for sales)
 */
export const updateInventoryQuantity = async (
  id: string,
  quantity: number
): Promise<{
  data: InventoryItem | null;
  error: { message: string } | null;
}> => {
  return updateInventoryItem(id, { totalAmount: quantity });
};
