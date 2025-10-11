import { useState, useCallback } from 'react';
import { API_CONFIG } from '@/config/api';

interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

interface UseApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  token?: string | null;
  params?: Record<string, string | number | boolean>;
  pathParams?: Record<string, string | number>;
}

interface UseApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  execute: (endpoint: string, options?: UseApiOptions) => Promise<{ data: T | null; error: ApiError | null }>;
}

/**
 * Build URL with path parameters
 * Example: buildUrl('/users/:id/posts/:postId', { id: '123', postId: '456' })
 * Returns: '/users/123/posts/456'
 */
function buildUrl(endpoint: string, pathParams?: Record<string, string | number>): string {
  if (!pathParams) return endpoint;
  
  let url = endpoint;
  Object.entries(pathParams).forEach(([key, value]) => {
    url = url.replace(`:${key}`, String(value));
  });
  
  return url;
}

/**
 * Build query string from params object
 * Example: buildQueryString({ page: 1, limit: 10, active: true })
 * Returns: '?page=1&limit=10&active=true'
 */
function buildQueryString(params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) return '';
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });
  
  return `?${searchParams.toString()}`;
}

/**
 * Custom hook for making API requests
 * @template T - The expected response data type
 */
export function useApi<T = unknown>(): UseApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (
    endpoint: string,
    options: UseApiOptions = {}
  ): Promise<{ data: T | null; error: ApiError | null }> => {
    setLoading(true);
    setError(null);

    try {
      const {
        method = 'GET',
        headers = {},
        body,
        token,
        params,
        pathParams,
      } = options;

      // Build URL with path parameters
      let processedEndpoint = buildUrl(endpoint, pathParams);
      
      // Add query parameters
      processedEndpoint += buildQueryString(params);

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      // Cookie-based auth: Authorization header only if explicitly provided
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      const config: RequestInit = {
        method,
        headers: requestHeaders,
        credentials: 'include',
      };

      if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
      }

      const url = processedEndpoint.startsWith('http') 
        ? processedEndpoint 
        : `${API_CONFIG.BASE_URL}${processedEndpoint}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseData;
      const contentType = response.headers.get('content-type');
      
      // Handle JSON responses (including application/problem+json)
      if (contentType && (contentType.includes('application/json') || contentType.includes('application/problem+json'))) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        // Handle different error response formats
        let errorMessage = 'An error occurred';
        let errorDetails = {};
        
        if (typeof responseData === 'object') {
          // Handle ASP.NET Core ProblemDetails format
          errorMessage = responseData?.title || responseData?.detail || responseData?.message || responseData?.error || errorMessage;
          
          // Extract validation errors if present
          if (responseData?.errors && typeof responseData.errors === 'object') {
            errorDetails = responseData.errors;
          }
        } else if (typeof responseData === 'string') {
          errorMessage = responseData;
        }
        
        const apiError: ApiError = {
          message: errorMessage,
          status: response.status,
          errors: Object.keys(errorDetails).length > 0 ? errorDetails : undefined,
        };
        setError(apiError);
        setData(null);
        return { data: null, error: apiError };
      }

      setData(responseData);
      setError(null);
      return { data: responseData, error: null };
    } catch (err: unknown) {
      const apiError: ApiError = {
        message: err instanceof Error && err.name === 'AbortError' 
          ? 'Request timeout' 
          : err instanceof Error ? err.message : 'Network error occurred',
        status: 0,
      };
      setError(apiError);
      setData(null);
      return { data: null, error: apiError };
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, error, loading, execute };
}

/**
 * Utility function for making one-off API requests without hook
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: UseApiOptions = {}
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const {
      method = 'GET',
      headers = {},
      body,
      token,
      params,
      pathParams,
    } = options;

    // Build URL with path parameters
    let processedEndpoint = buildUrl(endpoint, pathParams);
    
    // Add query parameters
    processedEndpoint += buildQueryString(params);

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Cookie-based auth: Authorization header only if explicitly provided
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
      credentials: 'include',
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const url = processedEndpoint.startsWith('http') 
      ? processedEndpoint 
      : `${API_CONFIG.BASE_URL}${processedEndpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let responseData;
    const contentType = response.headers.get('content-type');
    
    // Handle JSON responses (including application/problem+json)
    if (contentType && (contentType.includes('application/json') || contentType.includes('application/problem+json'))) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      // Handle different error response formats
      let errorMessage = 'An error occurred';
      let errorDetails = {};
      
      if (typeof responseData === 'object') {
        // Handle ASP.NET Core ProblemDetails format
        errorMessage = responseData?.title || responseData?.detail || responseData?.message || responseData?.error || errorMessage;
        
        // Extract validation errors if present
        if (responseData?.errors && typeof responseData.errors === 'object') {
          errorDetails = responseData.errors;
        }
      } else if (typeof responseData === 'string') {
        errorMessage = responseData;
      }
      
      const apiError: ApiError = {
        message: errorMessage,
        status: response.status,
        errors: Object.keys(errorDetails).length > 0 ? errorDetails : undefined,
      };
      return { data: null, error: apiError };
    }

    return { data: responseData, error: null };
  } catch (err: unknown) {
    const apiError: ApiError = {
      message: err instanceof Error && err.name === 'AbortError' 
        ? 'Request timeout' 
        : err instanceof Error ? err.message : 'Network error occurred',
      status: 0,
    };
    return { data: null, error: apiError };
  }
}

export default useApi;
