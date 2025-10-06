import { apiRequest } from '@/hooks/use-api';
import { API_ENDPOINTS } from '@/config/api';

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Session {
  email: string;
}

export interface AuthResponse {
  data: Session | null;
  error: { message: string } | null;
}

/**
 * Sign up a new user
 */
export const signUp = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const { data, error } = await apiRequest<Session>(API_ENDPOINTS.AUTH.SIGN_UP, {
    method: 'POST',
    body: {
      email,
      password,
    },
  });

  if (error) {
    return { data: null, error };
  }

  localStorage.setItem('email', JSON.stringify(email));

  return { data, error: null };
};

/**
 * Sign in an existing user
 */
export const signIn = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const { data, error } = await apiRequest<Session>(API_ENDPOINTS.AUTH.SIGN_IN, {
    method: 'POST',
    params: { useCookies: true },
    body: {
      email,
      password,
    },
  });

  if (error) {
    return { data: null, error };
  }

  // Using cookie based auth
  if (!error) {
    localStorage.setItem('email', JSON.stringify(email));
  }

  return { data, error: null };
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<{ error: { message: string } | null }> => {
  const { error } = await apiRequest(API_ENDPOINTS.AUTH.SIGN_OUT, {
    method: 'POST',
  });

  localStorage.removeItem('email');

  return { error: error || null };
};

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    // Redirect to Google OAuth endpoint
    const redirectUrl = `${window.location.origin}/auth/callback`;
    window.location.href = `${API_ENDPOINTS.AUTH.GOOGLE_AUTH}?redirect_uri=${encodeURIComponent(redirectUrl)}`;
    
    return { data: null, error: null };
  } catch (err: any) {
    return { 
      data: null, 
      error: { message: err.message || 'Failed to initiate Google sign-in' } 
    };
  }
};

/**
 * Get current session
 */
export const getSession = async (): Promise<AuthResponse> => {
  const { data, error } = await apiRequest<Session>(API_ENDPOINTS.AUTH.GET_SESSION, {
    method: 'GET',
  });

  if (error) {
    localStorage.removeItem('email');
    return { data: null, error };
  }

  // Update stored user data
  if (data) {
    localStorage.setItem('email', JSON.stringify(data.email));
  }

  return { data, error: null };
};

/**
 * Refresh authentication token
 * Not needed. Using cookie based auth
 */
// export const refreshToken = async (): Promise<AuthResponse> => {
//   const { data, error } = await apiRequest<Session>(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
//     method: 'POST',
//   });

//   if (error) {
//     localStorage.removeItem('auth_token');
//     localStorage.removeItem('user');
//     return { data: null, error };
//   }

//   if (data?.token) {
//     localStorage.setItem('auth_token', data.token);
//     if (data.user) {
//       localStorage.setItem('user', JSON.stringify(data.user));
//     }
//   }

//   return { data, error: null };
// };

/**
 * Get stored user from localStorage
 */
export const getStoredUserEmail = (): string | null => {
  try {
    const emailStr = localStorage.getItem('email');
    return emailStr ? emailStr : null;
  } catch {
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => { 
  const email = getStoredUserEmail();
  return !!(email);
};
