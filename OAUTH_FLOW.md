# OAuth / External Login Flow

## Overview
Implementation of OAuth 2.0 authentication flow for external login providers (Google, Microsoft, etc.) following .NET Identity API patterns. Users can sign in with external providers OR link external accounts to their existing password-based accounts.

## Supported Providers
- **Google** - Primary OAuth provider
- Extensible to support Microsoft, GitHub, Facebook, etc.

## Authentication Modes

### 1. Sign In with OAuth (No Password Account)
Users can create an account and sign in using only their OAuth provider without setting a password.

### 2. Link OAuth to Existing Account
Users with password-based accounts can link external OAuth providers for additional sign-in options.

### 3. Hybrid Authentication
Users can have both password authentication AND multiple linked OAuth providers, allowing them to sign in using any method.

## API Endpoints

### Sign In with OAuth Provider

**Endpoint:** `GET /auth/{provider}` (e.g., `/auth/google`)

**Query Parameters:**
- `redirect_uri` - URL to redirect back to after OAuth flow completes

**Flow:**
1. Frontend redirects user to this endpoint
2. Backend redirects to OAuth provider's authorization page
3. User authorizes the application
4. OAuth provider redirects back to backend with authorization code
5. Backend exchanges code for access token
6. Backend retrieves user info from provider
7. Backend creates/updates user account and sets authentication cookie
8. Backend redirects to `redirect_uri`

**Example:**
```
GET /auth/google?redirect_uri=http://localhost:8080/auth/callback
```

### Link External Login

**Endpoint:** `GET /auth/manage/linklogin/{provider}`

**Authentication:** Required (user must be signed in)

**Query Parameters:**
- `redirect_uri` - URL to redirect back to after linking

**Flow:**
1. Authenticated user initiates linking from Settings page
2. Frontend redirects to this endpoint
3. Backend redirects to OAuth provider
4. User authorizes (may need to sign in to provider)
5. Provider redirects back to backend
6. Backend links the external account to current user
7. Backend redirects to `redirect_uri` with `action=link` parameter

**Example:**
```
GET /auth/manage/linklogin/google?redirect_uri=http://localhost:8080/auth/callback?action=link
```

### Get Linked External Logins

**Endpoint:** `GET /auth/manage/info`

**Authentication:** Required

**Response:**
```json
{
  "email": "user@example.com",
  "isEmailConfirmed": true,
  "externalLogins": [
    {
      "providerKey": "google",
      "providerDisplayName": "Google"
    }
  ]
}
```

### Unlink External Login

**Endpoint:** `DELETE /auth/manage/linklogin`

**Authentication:** Required

**Request Body:**
```json
{
  "loginProvider": "google"
}
```

**Response:**
```json
{
  "success": true
}
```

**Note:** Users cannot unlink their only authentication method. They must have either:
- A password set, OR
- At least one other linked external login

## Frontend Implementation

### Service Methods

```typescript
// Sign in with OAuth provider
export const signInWithGoogle = async (): Promise<AuthResponse>;

// Get linked external logins
export const getExternalLogins = async (): Promise<{
  data: ExternalLogin[] | null;
  error: { message: string } | null;
}>;

// Link external login to current account
export const linkExternalLogin = async (
  provider: string
): Promise<{ error: { message: string } | null }>;

// Unlink external login
export const unlinkExternalLogin = async (
  provider: string
): Promise<{ error: { message: string } | null }>;
```

### OAuth Callback Handler

**Route:** `/auth/callback`

**Component:** `OAuthCallback.tsx`

**Responsibilities:**
1. Check for OAuth errors in URL parameters
2. Determine if this is a sign-in or linking operation (`action=link`)
3. Refresh session to get updated authentication state
4. Show success/error feedback
5. Redirect to appropriate page:
   - Sign-in: Redirect to dashboard (`/`)
   - Linking: Redirect to settings (`/settings`)

**URL Parameters:**
- `error` - Error code if OAuth failed
- `error_description` - Human-readable error message
- `action` - Set to `link` when linking an external account

### Sign In Flow

```typescript
const handleGoogleSignIn = async () => {
  setLoading(true);
  // Redirects to /auth/google?redirect_uri=...
  await signInWithGoogle();
  // User will be redirected away, then back to /auth/callback
};
```

### Link External Account Flow

```typescript
const handleLinkGoogle = async () => {
  setLoading(true);
  // Redirects to /auth/manage/linklogin/google?redirect_uri=...
  const { error } = await linkExternalLogin('google');
  if (error) {
    toast({ title: "Error", description: error.message });
  }
  // User will be redirected away, then back to /auth/callback?action=link
};
```

### Unlink External Account Flow

```typescript
const handleUnlinkGoogle = async () => {
  const { error } = await unlinkExternalLogin('google');
  if (error) {
    toast({ 
      title: "Error", 
      description: error.message,
      variant: "destructive" 
    });
  } else {
    toast({ 
      title: "Success", 
      description: "Google account unlinked" 
    });
    await loadExternalLogins(); // Refresh the list
  }
};
```

## Settings Page Integration

### Display Linked Accounts

```typescript
const [externalLogins, setExternalLogins] = useState<ExternalLogin[]>([]);

useEffect(() => {
  const loadLogins = async () => {
    const { data } = await getExternalLogins();
    if (data) {
      setExternalLogins(data);
    }
  };
  loadLogins();
}, []);

// Check if provider is linked
const isGoogleLinked = externalLogins.some(
  login => login.providerKey === 'google'
);
```

### UI Components

```tsx
{isGoogleLinked ? (
  <Button 
    variant="destructive" 
    onClick={handleUnlinkGoogle}
  >
    Unlink Google Account
  </Button>
) : (
  <Button 
    variant="outline" 
    onClick={handleLinkGoogle}
  >
    <GoogleIcon /> Link Google Account
  </Button>
)}
```

## Security Considerations

### State Parameter
OAuth providers use a `state` parameter to prevent CSRF attacks. The backend handles this automatically.

### Redirect URI Validation
The backend must validate that `redirect_uri` matches allowed origins to prevent open redirect vulnerabilities.

### Cookie-Based Authentication
After successful OAuth, the backend sets an HTTP-only authentication cookie, which is automatically included in subsequent requests.

### Account Linking Security
- Users must be authenticated to link external accounts
- Prevents account takeover by requiring existing session
- External account can only be linked to one user

### Email Verification
- OAuth providers typically verify email addresses
- Accounts created via OAuth may have `emailConfirmed: true` automatically
- Backend should trust provider's email verification

## Error Handling

### Common OAuth Errors

**Access Denied**
```
error=access_denied
error_description=User denied authorization
```
User clicked "Cancel" on OAuth provider's consent screen.

**Invalid Request**
```
error=invalid_request
error_description=Missing required parameter
```
Configuration issue with OAuth setup.

**Server Error**
```
error=server_error
error_description=Provider encountered an error
```
OAuth provider had an internal error.

### Frontend Error Handling

```typescript
// In OAuthCallback component
const error = searchParams.get('error');
const errorDescription = searchParams.get('error_description');

if (error) {
  toast({
    title: "Authentication Failed",
    description: errorDescription || error,
    variant: "destructive",
  });
  // Show error UI and option to return to login
}
```

### Backend Error Scenarios

1. **Email Already Exists**
   - OAuth email matches existing account
   - Backend should link accounts or show error

2. **Provider Account Already Linked**
   - External account already linked to different user
   - Backend returns error, frontend shows message

3. **Cannot Unlink Last Method**
   - User tries to unlink their only authentication method
   - Backend returns error with appropriate message

## Testing Checklist

### Sign In Flow
- [ ] New user can sign in with Google
- [ ] Existing OAuth user can sign in
- [ ] Callback page shows loading state
- [ ] Successful sign-in redirects to dashboard
- [ ] Failed sign-in shows error message
- [ ] Session is properly established
- [ ] User data is correctly stored

### Link Account Flow
- [ ] Authenticated user can link Google account
- [ ] Callback page detects linking operation
- [ ] Successful linking redirects to settings
- [ ] Linked account appears in settings
- [ ] Cannot link same account twice
- [ ] Cannot link account already linked to another user

### Unlink Account Flow
- [ ] User can unlink external account
- [ ] Cannot unlink if it's the only auth method
- [ ] Unlinked account removed from settings
- [ ] Can re-link after unlinking

### Error Handling
- [ ] User cancels OAuth consent
- [ ] Network errors handled gracefully
- [ ] Invalid redirect_uri rejected
- [ ] Expired OAuth state handled

### Security
- [ ] CSRF protection via state parameter
- [ ] Redirect URI validation
- [ ] HTTP-only cookies set correctly
- [ ] No sensitive data in URL parameters

## Multi-Provider Support

### Adding New Providers

1. **Backend Configuration**
   - Add provider credentials to configuration
   - Register provider in Identity configuration
   - Add provider-specific endpoint

2. **Frontend Updates**
   - Add provider to API endpoints
   - Create sign-in method (e.g., `signInWithMicrosoft`)
   - Add provider icon and branding
   - Update Settings page UI

3. **Example: Adding Microsoft**

```typescript
// api.ts
AUTH: {
  // ...
  MICROSOFT_AUTH: '/auth/microsoft',
}

// authService.ts
export const signInWithMicrosoft = async (): Promise<AuthResponse> => {
  try {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    window.location.href = `${API_ENDPOINTS.AUTH.MICROSOFT_AUTH}?redirect_uri=${encodeURIComponent(redirectUrl)}`;
    return { data: null, error: null };
  } catch (err: unknown) {
    return { 
      data: null, 
      error: { message: 'Failed to initiate Microsoft sign-in' } 
    };
  }
};

// Settings.tsx
const handleLinkMicrosoft = async () => {
  await linkExternalLogin('microsoft');
};
```

## Best Practices

### User Experience
1. **Clear Branding**: Use official provider logos and colors
2. **Loading States**: Show spinner during OAuth redirects
3. **Error Messages**: Provide clear, actionable error messages
4. **Confirmation**: Confirm before unlinking accounts
5. **Status Indicators**: Show which accounts are linked

### Security
1. **HTTPS Only**: OAuth must use HTTPS in production
2. **Validate Redirects**: Whitelist allowed redirect URIs
3. **Secure Cookies**: Use HTTP-only, Secure, SameSite cookies
4. **Token Storage**: Never store OAuth tokens in localStorage
5. **Minimal Scopes**: Request only necessary OAuth scopes

### Performance
1. **Fast Redirects**: Minimize processing before OAuth redirect
2. **Callback Optimization**: Quick session refresh on callback
3. **Caching**: Cache external login list in Settings

### Maintenance
1. **Provider Updates**: Monitor OAuth provider API changes
2. **Token Refresh**: Implement token refresh if needed
3. **Deprecation**: Handle provider deprecations gracefully
4. **Logging**: Log OAuth errors for debugging

## Troubleshooting

### "Redirect URI Mismatch"
- Check OAuth provider console configuration
- Ensure redirect_uri exactly matches registered URI
- Include protocol (http/https) and port if needed

### "User Not Authenticated After Callback"
- Verify cookie is being set by backend
- Check cookie domain and SameSite settings
- Ensure credentials: 'include' in fetch requests

### "Cannot Link Account"
- Verify user is authenticated before linking
- Check if account is already linked elsewhere
- Ensure provider returns consistent user identifier

### "Session Lost After Redirect"
- Check cookie expiration settings
- Verify cookie is HTTP-only and Secure
- Ensure SameSite attribute is correct for cross-site scenarios
