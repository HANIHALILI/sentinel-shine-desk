# StatusGuard — Environment Variables

All environment variables are prefixed with `VITE_` for Vite build-time injection.

## Required

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for the StatusGuard REST API | `https://api.statusguard.internal/api/v1` |

## Optional

| Variable | Description | Default |
|---|---|---|
| `VITE_WS_URL` | WebSocket URL for real-time updates | _(disabled)_ |
| `VITE_API_TIMEOUT` | Request timeout in ms | `10000` |
| `VITE_API_MAX_RETRIES` | Max retry attempts for failed requests | `3` |
| `VITE_EMBED_MODE` | Force embed mode globally | `false` |

## OIDC Authentication

| Variable | Description | Example |
|---|---|---|
| `VITE_OIDC_ISSUER` | OIDC Identity Provider issuer URL | `https://keycloak.example.com/realms/statusguard` |
| `VITE_OIDC_CLIENT_ID` | OIDC Client ID (public client) | `statusguard-frontend` |
| `VITE_OIDC_SCOPES` | Space-separated OIDC scopes | `openid profile email` |
| `VITE_OIDC_REDIRECT_URI` | Post-login redirect URI | `https://status.example.com/auth/callback` |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | Post-logout redirect URI | `https://status.example.com` |
| `VITE_OIDC_ROLE_CLAIM` | JWT claim path for roles (dot-separated for nested) | `realm_access.roles` |

## Example `.env` file

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/ws
VITE_OIDC_ISSUER=https://keycloak.local/realms/statusguard
VITE_OIDC_CLIENT_ID=statusguard-frontend
VITE_OIDC_SCOPES=openid profile email
VITE_OIDC_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:5173
VITE_OIDC_ROLE_CLAIM=realm_access.roles
```

## OIDC Provider Configuration

### Keycloak Example

1. Create realm `statusguard`
2. Create client `statusguard-frontend`:
   - Client type: **Public** (no client secret)
   - Valid redirect URIs: `https://status.example.com/auth/callback`
   - Valid post logout redirect URIs: `https://status.example.com`
   - Web origins: `https://status.example.com`
3. Create roles: `admin`, `editor`, `viewer`
4. Assign roles to users via realm roles or client roles
5. Ensure the `realm_access.roles` claim is included in tokens

### Dex Example

```yaml
connectors:
  - type: ldap
    name: LDAP
    config:
      host: ldap.example.com:636

staticClients:
  - id: statusguard-frontend
    name: StatusGuard
    redirectURIs:
      - https://status.example.com/auth/callback
    public: true
```

### Generic OIDC

Any provider supporting:
- Authorization Code Flow with PKCE
- `openid`, `profile`, `email` scopes
- Role claims in ID token (configurable path via `VITE_OIDC_ROLE_CLAIM`)
