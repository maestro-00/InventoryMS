import { apiRequest } from '@/hooks/use-api';
import { API_ENDPOINTS } from '@/config/api';

export interface User {
  id: string;
  email: string;
  emailConfirmed?: boolean;
  twoFactorEnabled?: boolean;
  created_at: string;
}

export interface Session {
  email: string;
  emailConfirmed?: boolean;
  twoFactorEnabled?: boolean;
}

export interface TwoFactorInfo {
  sharedKey: string;
  recoveryCodesLeft: number;
  recoveryCodes?: string[];
  isTwoFactorEnabled: boolean;
  isMachineRemembered: boolean;
}

export interface TwoFactorResponse {
  sharedKey?: string;
  recoveryCodesLeft?: number;
  recoveryCodes?: string[];
  isTwoFactorEnabled?: boolean;
  isMachineRemembered?: boolean;
}

export interface AuthResponse {
  data: Session | null;
  error: { message: string, status?: number } | null;
}

/**
 * Sign up a new user
 */
export const signUp = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const { data, error } = await apiRequest<Session>(API_ENDPOINTS.AUTH.SIGN_UP, {
    method: 'POST',
    body: {
      name,
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
    // Don't override the error message for 2FA requirement
    if (error.status === 401 && error.message !== "RequiresTwoFactor") {
      error.message = "Email or password is invalid.";
    }
    return { data: null, error };
  }

  // Using cookie based auth
  if (!error) {
    localStorage.setItem('email', JSON.stringify(email));
  }

  return { data, error: null };
};

/**
 * Verify 2FA code during login
 */
export const verify2FALogin = async (
  email: string,
  password: string,
  twoFactorCode: string
): Promise<AuthResponse> => {
  const { data, error } = await apiRequest<Session>(API_ENDPOINTS.AUTH.SIGN_IN, {
    method: 'POST',
    params: { useCookies: true },
    body: {
      email,
      password,
      twoFactorCode,
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
 * Verify recovery code during login
 */
export const verify2FARecoveryCode = async (
  email: string,
  password: string,
  twoFactorRecoveryCode: string
): Promise<AuthResponse> => {
  const { data, error } = await apiRequest<Session>(API_ENDPOINTS.AUTH.SIGN_IN, {
    method: 'POST',
    params: { useCookies: true },
    body: {
      email,
      password,
      twoFactorRecoveryCode,
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
  } catch (err: unknown) {
    return { 
      data: null, 
      error: { message: err instanceof Error ? err.message : 'Failed to initiate Google sign-in' } 
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

/**
 * Resend email confirmation
 */
export const resendConfirmationEmail = async (
  email: string
): Promise<{ error: { message: string } | null }> => {
  const { error } = await apiRequest(API_ENDPOINTS.AUTH.SEND_CONFIRM_EMAIL, {
    method: 'POST',
    body: { email },
  });

  return { error: error || null };
};

/**
 * Confirm email with userId and code from email link
 */
export const confirmEmail = async (
  userId: string,
  code: string,
  changedEmail?: string
): Promise<{ error: { message: string } | null }> => {
  const { error } = await apiRequest(API_ENDPOINTS.AUTH.CONFIRM_EMAIL, {
    method: 'GET',
    params: { 
      userId, 
      code,
      ...(changedEmail && { changedEmail })
    },
  });

  return { error: error || null };
};

/**
 * Request password reset
 */
export const forgotPassword = async (
  email: string
): Promise<{ error: { message: string } | null }> => {
  const { error } = await apiRequest(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
    method: 'POST',
    body: { email },
  });

  return { error: error || null };
};

/**
 * Reset password with code from email
 */
export const resetPassword = async (
  email: string,
  resetCode: string,
  newPassword: string
): Promise<{ error: { message: string } | null }> => {
  const { error } = await apiRequest(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
    method: 'POST',
    body: {
      email,
      resetCode,
      newPassword,
    },
  });

  return { error: error || null };
};

/**
 * Get user info
 */
export const getUserInfo = async (): Promise<{
  data: { email: string; isEmailConfirmed: boolean } | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<{ email: string; isEmailConfirmed: boolean }>(
    API_ENDPOINTS.AUTH.MANAGE_INFO,
    {
      method: 'GET',
    }
  );
  return { data, error: error || null };
};

/**
 * Update user email
 */
export const updateEmail = async (
  newEmail: string,
  password: string
): Promise<{ error: { message: string } | null }> => {
  const { error } = await apiRequest(API_ENDPOINTS.AUTH.UPDATE_EMAIL, {
    method: 'POST',
    body: {
      newEmail,
      password,
    },
  });

  return { error: error || null };
};

/**
 * Change password
 */
export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<{ error: { message: string } | null }> => {
  const { error } = await apiRequest(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
    method: 'POST',
    body: {
      oldPassword,
      newPassword,
    },
  });

  return { error: error || null };
};

/**
 * Get 2FA info
 */
export const get2FAInfo = async (): Promise<{
  data: TwoFactorInfo | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<TwoFactorInfo>(
    API_ENDPOINTS.AUTH.MANAGE_2FA,
    {
      method: 'POST',
      body: {}
    }
  );

  return { data, error: error || null };
};

/**
 * Enable 2FA
 * Step 1: Call with enable=true to enable 2FA
 * Step 2: Call with twoFactorCode to verify and get recovery codes
 */
export const enable2FA = async (
  twoFactorCode?: string,
  resetSharedKey?: boolean
): Promise<{
  data: TwoFactorResponse | null;
  error: { message: string } | null;
}> => {
  const body: Record<string, unknown> = {
    enable: true,
  };

  if (twoFactorCode) {
    body.twoFactorCode = twoFactorCode;
  }

  if (resetSharedKey) {
    body.resetSharedKey = resetSharedKey;
  }

  const { data, error } = await apiRequest<TwoFactorResponse>(
    API_ENDPOINTS.AUTH.MANAGE_2FA,
    {
      method: 'POST',
      body,
    }
  );

  return { data, error: error || null };
};

/**
 * Disable 2FA
 */
export const disable2FA = async (): Promise<{ 
  data: TwoFactorResponse | null;
  error: { message: string } | null 
}> => {
  const { data, error } = await apiRequest<TwoFactorResponse>(
    API_ENDPOINTS.AUTH.MANAGE_2FA,
    {
      method: 'POST',
      body: { 
        enable: false,
      },
    }
  );

  return { data, error: error || null };
};

/**
 * Reset 2FA recovery codes
 */
export const reset2FARecoveryCodes = async (): Promise<{
  data: TwoFactorResponse | null;
  error: { message: string } | null;
}> => {
  const { data, error } = await apiRequest<TwoFactorResponse>(
    API_ENDPOINTS.AUTH.MANAGE_2FA,
    {
      method: 'POST',
      body: { 
        resetRecoveryCodes: true,
      },
    }
  );

  return { data, error: error || null };
};

/**
 * Forget 2FA machine
 */
export const forget2FAMachine = async (): Promise<{ 
  error: { message: string } | null 
}> => {
  const { error } = await apiRequest(
    API_ENDPOINTS.AUTH.MANAGE_2FA,
    {
      method: 'POST',
      body: { 
        forgetMachine: true,
      },
    }
  );

  return { error: error || null };
};
