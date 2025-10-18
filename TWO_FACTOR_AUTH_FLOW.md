# Two-Factor Authentication (2FA) Flow

## Overview
Implementation following .NET Identity API 2FA flow as documented in:
https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization?view=aspnetcore-9.0#use-the-post-manage2fa-endpoint

## API Endpoint

All 2FA operations use a single endpoint with different request bodies:

```
POST /auth/manage/2fa 
```

## Flow Steps

### 1. Get 2FA Information

**Request:**
```http
POST /auth/manage/2fa
Body: {}
```

**Response:**
```json
{
  "sharedKey": "BASE32_ENCODED_KEY",
  "recoveryCodesLeft": 10,
  "isTwoFactorEnabled": false,
  "isMachineRemembered": false
}
```

### 2. Enable 2FA (Step 1 - Get Shared Key)

**Request:**
```http
POST /auth/manage/2fa
Content-Type: application/json

{
  "enable": true
}
```

**Response:**
```json
{
  "sharedKey": "BASE32_ENCODED_KEY",
  "isTwoFactorEnabled": false
}
```

The frontend should:
1. Generate QR code from `sharedKey`
2. Display QR code for user to scan with authenticator app
3. Show manual entry option with the `sharedKey`

### 3. Enable 2FA (Step 2 - Verify Code)

After user scans QR code and gets a code from their authenticator app:

**Request:**
```http
POST /auth/manage/2fa
Content-Type: application/json

{
  "enable": true,
  "twoFactorCode": "123456"
}
```

**Response:**
```json
{
  "sharedKey": "BASE32_ENCODED_KEY",
  "recoveryCodes": [
    "XXXXXXXX",
    "YYYYYYYY",
    "ZZZZZZZZ",
    // ... more codes
  ],
  "isTwoFactorEnabled": true,
  "recoveryCodesLeft": 10
}
```

The frontend should:
1. Display recovery codes prominently
2. Allow user to copy/download codes
3. Warn user to save codes securely
4. Update UI to show 2FA is enabled

### 4. Disable 2FA

**Request:**
```http
POST /auth/manage/2fa
Content-Type: application/json

{
  "enable": false
}
```

**Response:**
```json
{
  "isTwoFactorEnabled": false
}
```

### 5. Reset Recovery Codes

**Request:**
```http
POST /auth/manage/2fa
Content-Type: application/json

{
  "resetRecoveryCodes": true
}
```

**Response:**
```json
{
  "recoveryCodes": [
    "AAAAAAAA",
    "BBBBBBBB",
    "CCCCCCCC",
    // ... new codes
  ],
  "recoveryCodesLeft": 10
}
```

### 6. Reset Shared Key

If user needs a new shared key (e.g., lost authenticator app):

**Request:**
```http
POST /auth/manage/2fa
Content-Type: application/json

{
  "enable": true,
  "resetSharedKey": true
}
```

**Response:**
```json
{
  "sharedKey": "NEW_BASE32_ENCODED_KEY",
  "isTwoFactorEnabled": false
}
```

### 7. Forget Machine

Remove "remember this device" setting:

**Request:**
```http
POST /auth/manage/2fa
Content-Type: application/json

{
  "forgetMachine": true
}
```

**Response:**
```json
{
  "isMachineRemembered": false
}
```

## Frontend Implementation

### Service Methods

```typescript
// Get 2FA info
export const get2FAInfo = async (): Promise<{
  data: TwoFactorInfo | null;
  error: { message: string } | null;
}>;

// Enable 2FA (can be called with or without code)
export const enable2FA = async (
  twoFactorCode?: string,
  resetSharedKey?: boolean
): Promise<{
  data: TwoFactorResponse | null;
  error: { message: string } | null;
}>;

// Disable 2FA
export const disable2FA = async (): Promise<{ 
  data: TwoFactorResponse | null;
  error: { message: string } | null 
}>;

// Reset recovery codes
export const reset2FARecoveryCodes = async (): Promise<{
  data: TwoFactorResponse | null;
  error: { message: string } | null;
}>;

// Forget machine
export const forget2FAMachine = async (): Promise<{ 
  error: { message: string } | null 
}>;
```

### User Flow in Settings Page

#### When 2FA is Disabled:

1. **Load 2FA Info**
   - Call `get2FAInfo()` on page load
   - Display current status

2. **Enable 2FA - Step 1**
   - Call `enable2FA()` without code
   - Receive `sharedKey`
   - Generate QR code: `otpauth://totp/InventoryMS:user@email.com?secret=SHARED_KEY&issuer=InventoryMS`
   - Display QR code and manual key

3. **Enable 2FA - Step 2**
   - User scans QR code with authenticator app
   - User enters 6-digit code from app
   - Call `enable2FA(code)`
   - Receive and display recovery codes
   - Update UI to show 2FA enabled

#### When 2FA is Enabled:

1. **Display Status**
   - Show "2FA Enabled" badge
   - Show recovery codes remaining count

2. **Reset Recovery Codes**
   - User clicks "Reset Recovery Codes"
   - Call `reset2FARecoveryCodes()`
   - Display new recovery codes
   - Allow copy/download

3. **Disable 2FA**
   - User clicks "Disable 2FA"
   - Call `disable2FA()`
   - Update UI to show 2FA disabled

## QR Code Generation

The QR code should encode a URI in this format:

```
otpauth://totp/{Issuer}:{Email}?secret={SharedKey}&issuer={Issuer}
```

Example:
```
otpauth://totp/InventoryMS:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=InventoryMS
```

Components:
- **Issuer**: Your app name (e.g., "InventoryMS")
- **Email**: User's email address
- **SharedKey**: The base32-encoded shared key from the API
- **issuer**: Same as the issuer in the label (for compatibility)

## Recovery Codes

### Format
- Typically 8-10 alphanumeric codes
- Each code can be used once
- Should be stored securely by the user

### Display Requirements
- Show codes in a monospace font
- Provide copy-to-clipboard button
- Provide download-as-text-file button
- Warn user to save codes securely
- Show count of remaining codes

### Usage
- User can use a recovery code instead of 2FA code during login
- Each code is single-use
- User should generate new codes when running low

## Security Considerations

### Shared Key
- Base32-encoded secret
- Should be kept secure
- Used to generate TOTP codes
- Can be reset if compromised

### TOTP Algorithm
- Time-based One-Time Password
- 6-digit codes
- 30-second validity window
- Standard RFC 6238 implementation

### Recovery Codes
- Single-use backup codes
- Should be stored securely offline
- Can be regenerated at any time
- Typically 10 codes provided

### Machine Remember
- Optional "remember this device" feature
- Reduces 2FA prompts on trusted devices
- Can be forgotten/cleared

## Error Handling

### Common Errors

1. **Invalid Code**
   - User enters wrong 6-digit code
   - Show error: "Invalid verification code"
   - Allow retry

2. **Expired Code**
   - TOTP code expired (>30 seconds old)
   - Show error: "Code expired, please try again"
   - User gets new code from app

3. **2FA Already Enabled**
   - Trying to enable when already enabled
   - Show current status
   - Offer to disable first

4. **No Recovery Codes Left**
   - All recovery codes used
   - Prompt user to generate new codes
   - Provide reset option

## Testing Checklist

- [ ] Get 2FA info shows correct status
- [ ] QR code displays correctly
- [ ] Manual key entry works
- [ ] Authenticator app can scan QR code
- [ ] Valid 6-digit code enables 2FA
- [ ] Invalid code shows error
- [ ] Recovery codes are displayed
- [ ] Recovery codes can be copied
- [ ] Recovery codes can be downloaded
- [ ] Disable 2FA works
- [ ] Reset recovery codes works
- [ ] Recovery codes count updates
- [ ] UI updates after enable/disable
- [ ] Error messages are clear
- [ ] Loading states work correctly

## Authenticator App Compatibility

Tested with:
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- LastPass Authenticator

All standard TOTP authenticator apps should work.

## Example Implementation

### Enable 2FA Flow

```typescript
// Step 1: Get shared key
const handleStartEnable2FA = async () => {
  const { data, error } = await enable2FA();
  if (data?.sharedKey) {
    setSharedKey(data.sharedKey);
    setShowQRCode(true);
  }
};

// Step 2: Verify code and complete setup
const handleVerifyCode = async (code: string) => {
  const { data, error } = await enable2FA(code);
  if (data?.recoveryCodes) {
    setRecoveryCodes(data.recoveryCodes);
    setShowRecoveryCodes(true);
    setIs2FAEnabled(true);
  }
};
```

### Disable 2FA Flow

```typescript
const handleDisable2FA = async () => {
  const { data, error } = await disable2FA();
  if (!error) {
    setIs2FAEnabled(false);
    toast({ title: "2FA Disabled" });
  }
};
```

### Reset Recovery Codes Flow

```typescript
const handleResetCodes = async () => {
  const { data, error } = await reset2FARecoveryCodes();
  if (data?.recoveryCodes) {
    setRecoveryCodes(data.recoveryCodes);
    setShowRecoveryCodes(true);
  }
};
```

## Additional Features

### Forget Machine
Allow users to clear "remember this device" setting:

```typescript
const handleForgetMachine = async () => {
  const { error } = await forget2FAMachine();
  if (!error) {
    toast({ title: "Device forgotten" });
  }
};
```

### Reset Shared Key
If user loses access to authenticator app:

```typescript
const handleResetSharedKey = async () => {
  const { data, error } = await enable2FA(undefined, true);
  if (data?.sharedKey) {
    setSharedKey(data.sharedKey);
    // Show new QR code
  }
};
```
