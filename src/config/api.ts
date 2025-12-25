// API Configuration
export const API_CONFIG = {
  
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  TIMEOUT: 30000,
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    SIGN_UP: '/auth/register',
    SIGN_IN: '/auth/login',
    SIGN_OUT: '/auth/logout',
    GOOGLE_AUTH: '/auth/google',
    EXTERNAL_AUTH: '/auth/external-login',
    GET_SESSION: '/auth/pingauth',
    REFRESH_TOKEN: '/auth/refresh',
    MANAGE_INFO: '/auth/manage/info',
    SEND_CONFIRM_EMAIL: '/auth/resendConfirmationEmail',
    CONFIRM_EMAIL: '/auth/confirmEmail',
    FORGOT_PASSWORD: '/auth/forgotPassword',
    RESET_PASSWORD: '/auth/resetPassword',
    CHANGE_PASSWORD: '/auth/manage/info',
    UPDATE_EMAIL: '/auth/manage/info',
    MANAGE_2FA: '/auth/manage/2fa',
    LINK_EXTERNAL_LOGIN: '/auth/manage/linklogin',
    GET_EXTERNAL_LOGINS: '/auth/manage/info',
    UNLINK_EXTERNAL_LOGIN: '/auth/manage/linklogin',
  },
  RETAILSTOCK: {
    LIST: '/RetailStock',
    UPDATE: `/RetailStock`,
    GET: (id: string) => `/RetailStock/${id}`,
    GETBYINVENTORYITEM: (id: string) => `/RetailStock/GetByInventoryItem/${id}`,
  },
  // Inventory endpoints
  INVENTORY: {
    LIST: '/InventoryItems',
    CREATE: '/InventoryItems',
    UPDATE: (id: string) => `/InventoryItems/${id}`,
    DELETE: (id: string) => `/InventoryItems/${id}`,
    GET: (id: string) => `/InventoryItems/${id}`,
    UPLOAD_IMAGE: '/inventory/upload-image',
  },
  
  // Inventory Item endpoints
  INVENTORYITEM: {
    LIST: '/InventoryItemTypes',
    CREATE: '/InventoryItemTypes',
    UPDATE: (id: string) => `/InventoryItemTypes/${id}`,
    DELETE: (id: string) => `/InventoryItemTypes/${id}`,
    GET: (id: string) => `/InventoryItemTypes/${id}`,
    UPLOAD_IMAGE: '/inventory/upload-image',
  },
  
  // Sales endpoints
  SALES: {
    LIST: '/SaleGroups',
    CREATE: '/SaleGroups',
    UPDATE: (id: string) => `/SaleGroups/${id}`,
    DELETE: (id: string) => `/SaleGroups/${id}`,
    GET: (id: string) => `/SaleGroups/${id}`,
    STATS: '/SaleGroups/stats',
    TODAY: '/Sales/today',
  },
  // Analytics endpoints
  ANALYTICS: {
    OVERVIEW: '/analytics/overview',
    REVENUE: '/analytics/revenue',
    TOP_ITEMS: '/analytics/top-items',
  },
};

export default API_CONFIG;
