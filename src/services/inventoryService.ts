import { apiRequest } from '@/hooks/use-api';
import { API_ENDPOINTS } from '@/config/api';

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  cost: number | null;
  quantity: number;
  reorder_level: number;
  image_url: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemData {
  name: string;
  description?: string | null;
  sku?: string | null;
  price: number;
  cost?: number | null;
  quantity: number;
  reorder_level: number;
  category?: string | null;
  image_url?: string | null;
}

export interface UpdateInventoryItemData extends Partial<CreateInventoryItemData> {}

/**
 * Get all inventory items for the current user
 */
export const getInventoryItems = async (): Promise<{
  data: InventoryItem[] | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<InventoryItem[]>(API_ENDPOINTS.INVENTORY.LIST, {
    method: 'GET',
  });

  return { data, error: error || null };
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
    API_ENDPOINTS.INVENTORY.CREATE,
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
    API_ENDPOINTS.INVENTORY.UPDATE(id),
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
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Failed to upload image' },
    };
  }
};

/**
 * Get low stock items (quantity < reorder_level)
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
    (item) => item.quantity < item.reorder_level
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
  return updateInventoryItem(id, { quantity });
};
