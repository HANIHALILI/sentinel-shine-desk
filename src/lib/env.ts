/**
 * Environment configuration schema.
 * All values sourced from environment variables at build time.
 */
export const env = {
  /** Base URL for the StatusGuard REST API */
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL as string || '/api/v1',

  /** WebSocket URL for real-time updates */
  WS_URL: import.meta.env.VITE_WS_URL as string || '',

  /** OIDC Identity Provider issuer URL */
  OIDC_ISSUER: import.meta.env.VITE_OIDC_ISSUER as string || '',

  /** OIDC Client ID */
  OIDC_CLIENT_ID: import.meta.env.VITE_OIDC_CLIENT_ID as string || '',

  /** OIDC scopes (space-separated) */
  OIDC_SCOPES: import.meta.env.VITE_OIDC_SCOPES as string || 'openid profile email',

  /** OIDC redirect URI after login */
  OIDC_REDIRECT_URI: import.meta.env.VITE_OIDC_REDIRECT_URI as string || `${window.location.origin}/auth/callback`,

  /** OIDC post-logout redirect URI */
  OIDC_POST_LOGOUT_REDIRECT_URI: import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI as string || window.location.origin,

  /** OIDC role claim path in ID token (dot-separated for nested) */
  OIDC_ROLE_CLAIM: import.meta.env.VITE_OIDC_ROLE_CLAIM as string || 'roles',

  /** Enable embedded mode globally (overridden by ?embed=true query param) */
  EMBED_MODE: import.meta.env.VITE_EMBED_MODE === 'true',

  /** Request timeout in milliseconds */
  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,

  /** Max retry attempts for failed requests */
  API_MAX_RETRIES: Number(import.meta.env.VITE_API_MAX_RETRIES) || 3,
} as const;
