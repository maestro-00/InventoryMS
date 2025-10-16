# Forgot Password Flow Documentation

## Overview
Complete password reset functionality integrated with .NET Identity API.

## User Flow

### Step 1: Request Password Reset
**Route:** `/auth/forgot-password`

1. User clicks "Forgot password?" link on sign-in page
2. Navigates to forgot password page
3. Enters email address
4. Clicks "Send Reset Instructions"
5. Backend sends email with reset link
6. User sees confirmation message

### Step 2: Reset Password
**Route:** `/auth/reset-password?email={email}&code={code}`

1. User receives email with reset link
2. Clicks link (contains email and reset code as query parameters)
3. Navigates to reset password page
4. Enters new password with real-time validation
5. Confirms new password
6. Submits form
7. Redirected to sign-in page on success

## Pages

### 1. Forgot Password Page (`/auth/forgot-password`)

**Features:**
- Email input field
- Form validation
- Loading state during API call
- Success confirmation screen
- Option to try different email
- Back to sign-in navigation

**API Call:**
```typescript
POST /auth/forgotPassword
Body: { email: string }
```

### 2. Reset Password Page (`/auth/reset-password`)

**Features:**
- Reads `email` and `code` from URL query parameters
- Displays email (read-only)
- New password input with validation
- Confirm password input
- Real-time password requirements feedback:
  - ✓ At least 6 characters
  - ✓ One lowercase letter (a-z)
  - ✓ One uppercase letter (A-Z)
  - ✓ One digit (0-9)
  - ✓ One special character (!@#$%^&*)
- Password match indicator
- Invalid link detection
- Error handling

**API Call:**
```typescript
POST /auth/resetPassword
Body: {
  email: string,
  resetCode: string,
  newPassword: string
}
```

## Password Requirements

All passwords must meet these criteria:
- Minimum 6 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one digit
- At least one special character

Visual indicators show which requirements are met in real-time.

## Error Handling

### Invalid Reset Link
If the URL is missing `email` or `code` parameters:
- Shows error message
- Provides "Request New Reset Link" button
- Provides "Back to Sign In" button

### Expired/Invalid Code
If the backend rejects the reset code:
- Shows error toast with message
- User can request a new reset link

### Password Validation Errors
- Real-time validation prevents submission
- Clear error messages for each requirement
- Password mismatch detection

## Backend Integration

### Expected Endpoints

#### 1. Forgot Password
```
POST /auth/forgotPassword
Content-Type: application/json

Request:
{
  "email": "user@example.com"
}

Response (Success): 200 OK
Response (Error): 400/404 with error message
```

#### 2. Reset Password
```
POST /auth/resetPassword
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "resetCode": "ABC123...",
  "newPassword": "NewPass123!"
}

Response (Success): 200 OK
Response (Error): 400 with error message
```

### Email Template Requirements

The backend should send an email containing a link like:
```
https://yourdomain.com/auth/reset-password?email=user@example.com&code=RESET_CODE_HERE
```

## Security Considerations

1. **Reset Code:** Should be:
   - Cryptographically secure
   - Time-limited (e.g., 1 hour expiry)
   - Single-use only
   - Invalidated after successful reset

2. **Password Requirements:** Enforced on both frontend and backend

3. **Rate Limiting:** Backend should implement rate limiting on forgot password endpoint

4. **Email Verification:** Consider requiring email verification before allowing password reset

## User Experience Features

### Visual Feedback
- Loading spinners during API calls
- Success/error toast notifications
- Real-time password validation with ✓/✗ icons
- Color-coded requirement indicators (green/gray/red)

### Navigation
- Clear "Back to Sign In" options
- "Try Different Email" option after sending
- Automatic redirect after successful reset

### Accessibility
- Proper form labels
- Required field indicators
- Clear error messages
- Keyboard navigation support

## Testing Checklist

- [ ] User can request password reset with valid email
- [ ] User receives email with reset link
- [ ] Reset link navigates to correct page with parameters
- [ ] Invalid/expired codes show appropriate error
- [ ] Password validation works correctly
- [ ] Password mismatch is detected
- [ ] Successful reset redirects to sign-in
- [ ] User can sign in with new password
- [ ] "Back to Sign In" navigation works
- [ ] "Try Different Email" works
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly
- [ ] Mobile responsive design works

## Routes Summary

```typescript
// In App.tsx
<Route path="auth/forgot-password" element={<ForgotPassword />} />
<Route path="auth/reset-password" element={<ResetPassword />} />
```

## Service Methods

```typescript
// In authService.ts

/**
 * Request password reset
 */
export const forgotPassword = async (
  email: string
): Promise<{ error: { message: string } | null }>;

/**
 * Reset password with code from email
 */
export const resetPassword = async (
  email: string,
  resetCode: string,
  newPassword: string
): Promise<{ error: { message: string } | null }>;
```

## Example Usage

### Requesting Password Reset
```typescript
const { error } = await forgotPassword("user@example.com");
if (error) {
  // Show error message
} else {
  // Show success message
}
```

### Resetting Password
```typescript
const { error } = await resetPassword(
  "user@example.com",
  "RESET_CODE",
  "NewPass123!"
);
if (error) {
  // Show error message
} else {
  // Redirect to sign-in
}
```

## Troubleshooting

### Common Issues

1. **Email not received:**
   - Check spam folder
   - Verify email address is correct
   - Check backend email service configuration

2. **Reset link doesn't work:**
   - Verify URL parameters are present
   - Check if code has expired
   - Ensure code hasn't been used already

3. **Password validation fails:**
   - Review password requirements
   - Ensure all criteria are met
   - Check for hidden characters

4. **Backend errors:**
   - Verify API endpoints are correct
   - Check CORS configuration
   - Review backend logs for errors
