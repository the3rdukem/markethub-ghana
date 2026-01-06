/**
 * Google OAuth Service
 *
 * Provides Google Sign-In functionality for buyers and vendors.
 * Credentials are managed from Admin → API Management.
 *
 * PRODUCTION-READY: All mock/stub logic removed.
 * All calls go through the Central API Execution Layer.
 *
 * Capabilities:
 * - Sign up with Google
 * - Sign in with Google
 * - Account linking for existing users
 * - Token verification
 */

import { useIntegrationsStore } from '../integrations-store';
import { executeAPI, isIntegrationReady, getIntegrationStatus, APIExecutionError } from '../api-execution-layer';

const INTEGRATION_ID = 'google_oauth';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  verified_email: boolean;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string[];
}

export interface GoogleAuthResult {
  success: boolean;
  user?: GoogleUserInfo;
  error?: string;
  integrationDisabled?: boolean;
}

// Default scopes for user authentication
const DEFAULT_SCOPES = [
  'openid',
  'email',
  'profile',
];

/**
 * Get the current OAuth configuration from the integrations store
 */
export const getGoogleOAuthConfig = (): GoogleOAuthConfig | null => {
  const store = useIntegrationsStore.getState();
  const integration = store.getIntegration(INTEGRATION_ID);

  if (!integration?.isEnabled || !integration?.isConfigured || integration?.status !== 'connected') {
    return null;
  }

  const clientId = store.getCredentialValue(INTEGRATION_ID, 'GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = store.getCredentialValue(INTEGRATION_ID, 'GOOGLE_OAUTH_CLIENT_SECRET');
  const redirectUri = store.getCredentialValue(INTEGRATION_ID, 'GOOGLE_OAUTH_REDIRECT_URI');

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
};

/**
 * Check if Google OAuth is available
 */
export const isGoogleOAuthEnabled = (): boolean => {
  return isIntegrationReady(INTEGRATION_ID);
};

/**
 * Get Google OAuth status for UI display
 */
export const getGoogleOAuthStatus = (): {
  available: boolean;
  message: string;
} => {
  const status = getIntegrationStatus(INTEGRATION_ID);
  return {
    available: status.available,
    message: status.message,
  };
};

/**
 * Generate the Google OAuth authorization URL
 */
export const getGoogleAuthUrl = (state?: string): string | null => {
  const config = getGoogleOAuthConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: DEFAULT_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state }),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/**
 * Exchange authorization code for tokens
 * This MUST be called from your backend to protect client secret
 */
export const exchangeCodeForTokens = async (code: string): Promise<{
  success: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  error?: string;
}> => {
  const config = getGoogleOAuthConfig();

  if (!config) {
    const status = getGoogleOAuthStatus();
    return {
      success: false,
      error: status.message || 'Google OAuth not configured',
    };
  }

  const result = await executeAPI<{
    access_token: string;
    id_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  }>(
    INTEGRATION_ID,
    'exchange_code_for_tokens',
    async () => {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || `Token exchange failed: ${response.status}`);
      }

      return response.json();
    },
    { timeout: 30000, maxRetries: 2 }
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error?.message || 'Failed to exchange authorization code',
    };
  }

  return {
    success: true,
    accessToken: result.data.access_token,
    idToken: result.data.id_token,
    refreshToken: result.data.refresh_token,
  };
};

/**
 * Get user info from access token
 */
export const getUserInfo = async (accessToken: string): Promise<GoogleAuthResult> => {
  const result = await executeAPI<{
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  }>(
    INTEGRATION_ID,
    'get_user_info',
    async () => {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.status}`);
      }

      return response.json();
    },
    { timeout: 15000, maxRetries: 2 }
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error?.message || 'Failed to get user info',
    };
  }

  return {
    success: true,
    user: {
      id: result.data.sub,
      email: result.data.email,
      name: result.data.name,
      given_name: result.data.given_name,
      family_name: result.data.family_name,
      picture: result.data.picture,
      verified_email: result.data.email_verified,
    },
  };
};

/**
 * Handle the OAuth callback and exchange code for user info
 * This performs the full OAuth flow: code → tokens → user info
 */
export const handleGoogleCallback = async (code: string): Promise<GoogleAuthResult> => {
  if (!isGoogleOAuthEnabled()) {
    const status = getGoogleOAuthStatus();
    return {
      success: false,
      error: status.message || 'Google Sign-In is not available',
      integrationDisabled: true,
    };
  }

  // Exchange code for tokens
  const tokenResult = await exchangeCodeForTokens(code);
  if (!tokenResult.success || !tokenResult.accessToken) {
    return {
      success: false,
      error: tokenResult.error || 'Failed to authenticate with Google',
    };
  }

  // Get user info using the access token
  const userResult = await getUserInfo(tokenResult.accessToken);
  if (!userResult.success || !userResult.user) {
    return {
      success: false,
      error: userResult.error || 'Failed to get user information',
    };
  }

  return {
    success: true,
    user: userResult.user,
  };
};

/**
 * Initiate Google Sign-In flow via redirect
 */
export const signInWithGoogle = (state?: string): { success: boolean; error?: string } => {
  if (!isGoogleOAuthEnabled()) {
    const status = getGoogleOAuthStatus();
    return {
      success: false,
      error: status.message || 'Google Sign-In is not available',
    };
  }

  const authUrl = getGoogleAuthUrl(state);
  if (!authUrl) {
    return {
      success: false,
      error: 'Could not generate authentication URL',
    };
  }

  // Redirect to Google OAuth
  if (typeof window !== 'undefined') {
    window.location.href = authUrl;
    return { success: true };
  }

  return {
    success: false,
    error: 'Cannot redirect in current environment',
  };
};

/**
 * Verify Google ID token
 * Used to verify tokens received from Google Identity Services
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<{
  valid: boolean;
  payload?: GoogleUserInfo;
  error?: string;
}> => {
  if (!isGoogleOAuthEnabled()) {
    return {
      valid: false,
      error: 'Google OAuth not configured',
    };
  }

  const result = await executeAPI<{
    sub: string;
    email: string;
    email_verified: string;
    name: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
    aud: string;
    exp: string;
  }>(
    INTEGRATION_ID,
    'verify_id_token',
    async () => {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
      );

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      return response.json();
    },
    { timeout: 15000, maxRetries: 2 }
  );

  if (!result.success || !result.data) {
    return {
      valid: false,
      error: result.error?.message || 'Token verification failed',
    };
  }

  // Verify the audience matches our client ID
  const config = getGoogleOAuthConfig();
  if (config && result.data.aud !== config.clientId) {
    return {
      valid: false,
      error: 'Token was not issued for this application',
    };
  }

  // Check if token is expired
  const expTime = parseInt(result.data.exp) * 1000;
  if (Date.now() > expTime) {
    return {
      valid: false,
      error: 'Token has expired',
    };
  }

  return {
    valid: true,
    payload: {
      id: result.data.sub,
      email: result.data.email,
      name: result.data.name,
      given_name: result.data.given_name,
      family_name: result.data.family_name,
      picture: result.data.picture,
      verified_email: result.data.email_verified === 'true',
    },
  };
};

/**
 * Load Google Identity Services library for One Tap sign-in
 */
export const loadGoogleIdentityServices = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window not available'));
      return;
    }

    // Check if already loaded
    if ((window as unknown as { google?: { accounts?: unknown } }).google?.accounts) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));

    document.head.appendChild(script);
  });
};

/**
 * Initialize Google One Tap sign-in
 */
export const initializeOneTap = async (options: {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
}): Promise<boolean> => {
  if (!isGoogleOAuthEnabled()) {
    options.onError?.('Google Sign-In is not available');
    return false;
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    options.onError?.('Google OAuth not configured');
    return false;
  }

  try {
    await loadGoogleIdentityServices();

    const google = (window as unknown as {
      google: {
        accounts: {
          id: {
            initialize: (opts: Record<string, unknown>) => void;
            prompt: () => void;
          };
        };
      };
    }).google;

    google.accounts.id.initialize({
      client_id: config.clientId,
      callback: (response: { credential?: string; error?: string }) => {
        if (response.credential) {
          options.onSuccess(response.credential);
        } else {
          options.onError?.(response.error || 'Sign-in failed');
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    google.accounts.id.prompt();
    return true;
  } catch (error) {
    options.onError?.(error instanceof Error ? error.message : 'Failed to initialize Google Sign-In');
    return false;
  }
};

/**
 * Revoke Google access token
 */
export const revokeGoogleAccess = async (token: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  const result = await executeAPI<void>(
    INTEGRATION_ID,
    'revoke_token',
    async () => {
      const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to revoke token');
      }
    },
    { timeout: 15000 }
  );

  return {
    success: result.success,
    error: result.error?.message,
  };
};
