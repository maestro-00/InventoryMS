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
  },
  // Inventory endpoints
  INVENTORY: {
    LIST: '/inventory',
    CREATE: '/inventory',
    UPDATE: (id: string) => `/inventory/${id}`,
    DELETE: (id: string) => `/inventory/${id}`,
    GET: (id: string) => `/inventory/${id}`,
    UPLOAD_IMAGE: '/inventory/upload-image',
  },
  // Sales endpoints
  SALES: {
    LIST: '/sales',
    CREATE: '/sales',
    GET: (id: string) => `/sales/${id}`,
    STATS: '/sales/stats',
    TODAY: '/sales/today',
  },
  // Analytics endpoints
  ANALYTICS: {
    OVERVIEW: '/analytics/overview',
    REVENUE: '/analytics/revenue',
    TOP_ITEMS: '/analytics/top-items',
  },
};

export default API_CONFIG;
