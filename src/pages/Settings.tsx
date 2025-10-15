import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserInfo,
  updateEmail,
  changePassword,
  get2FAInfo,
  enable2FA,
  disable2FA,
  reset2FARecoveryCodes,
  resendConfirmationEmail,
  TwoFactorInfo,
} from "@/services/authService";
import { Loader2, Mail, Lock, Shield, Check, X, AlertCircle, Copy, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const Settings = () => {
  const { toast } = useToast();
  const { user, refreshSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; isEmailConfirmed: boolean } | null>(null);
  const [twoFactorInfo, setTwoFactorInfo] = useState<TwoFactorInfo | null>(null);

  // Profile tab state
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  // Password tab state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // MFA tab state
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  useEffect(() => {
    loadUserInfo();
    load2FAInfo();
  }, []);

  const loadUserInfo = async () => {
    const { data, error } = await getUserInfo();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setUserInfo(data);
    }
  };

  const load2FAInfo = async () => {
    const { data, error } = await get2FAInfo();
    if (error) {
      console.error("Failed to load 2FA info:", error);
    } else if (data) {
      setTwoFactorInfo(data);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !emailPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await updateEmail(newEmail, emailPassword);
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Email update initiated. Please check your new email for verification.",
      });
      setNewEmail("");
      setEmailPassword("");
      await refreshSession();
      await loadUserInfo();
    }
  };

  const handleResendVerification = async () => {
    if (!userInfo?.email) return;

    setLoading(true);
    const { error } = await resendConfirmationEmail(userInfo.email);
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Verification email sent. Please check your inbox.",
      });
    }
  };

  const getPasswordRequirements = (password: string) => {
    return {
      minLength: password.length >= 6,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNonAlphanumeric: /[^a-zA-Z0-9]/.test(password),
      hasDigit: /\d/.test(password),
    };
  };

  const passwordRequirements = getPasswordRequirements(newPassword);
  const passwordsMatch = newPassword === confirmPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    const allRequirementsMet = Object.values(passwordRequirements).every((req) => req);
    if (!allRequirementsMet) {
      toast({
        title: "Error",
        description: "Password does not meet all requirements",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await changePassword(oldPassword, newPassword);
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data, error } = await enable2FA(mfaCode);
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setRecoveryCodes(data.recoveryCodes);
      setShowRecoveryCodes(true);
      setMfaCode("");
      await refreshSession();
      await load2FAInfo();
      toast({
        title: "Success",
        description: "Two-factor authentication enabled",
      });
    }
  };

  const handleDisable2FA = async () => {
    setLoading(true);
    const { error } = await disable2FA();
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Two-factor authentication disabled",
      });
      await refreshSession();
      await load2FAInfo();
    }
  };

  const handleResetRecoveryCodes = async () => {
    setLoading(true);
    const { data, error } = await reset2FARecoveryCodes();
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setRecoveryCodes(data.recoveryCodes);
      setShowRecoveryCodes(true);
      toast({
        title: "Success",
        description: "Recovery codes reset successfully",
      });
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast({
      title: "Copied",
      description: "Recovery codes copied to clipboard",
    });
  };

  const downloadRecoveryCodes = () => {
    const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const qrCodeUrl = twoFactorInfo
    ? `otpauth://totp/InventoryMS:${userInfo?.email}?secret=${twoFactorInfo.sharedKey}&issuer=InventoryMS`
    : "";

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <Mail className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="password">
              <Lock className="h-4 w-4 mr-2" />
              Password
            </TabsTrigger>
            <TabsTrigger value="mfa">
              <Shield className="h-4 w-4 mr-2" />
              Two-Factor Auth
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your email address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Email</Label>
                  <div className="flex items-center gap-2">
                    <Input value={userInfo?.email || user?.email || ""} disabled />
                    {userInfo?.isEmailConfirmed ? (
                      <div className="flex items-center text-green-600 text-sm whitespace-nowrap">
                        <Check className="h-4 w-4 mr-1" />
                        Verified
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-600 text-sm whitespace-nowrap">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Not Verified
                      </div>
                    )}
                  </div>
                  {!userInfo?.isEmailConfirmed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend Verification Email"}
                    </Button>
                )}
                </div>
                {!userInfo?.isEmailConfirmed && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You can use the app without verifying your email, but some features may be limited.
                  </AlertDescription>
                </Alert>
                )}
                <form onSubmit={handleUpdateEmail} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-email">New Email Address</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="new@email.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-password">Confirm Password</Label>
                    <Input
                      id="email-password"
                      type="password"
                      placeholder="Enter your password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Update Email
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="old-password">Current Password</Label>
                    <Input
                      id="old-password"
                      type="password"
                      placeholder="Enter current password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    {newPassword && (
                      <div className="mt-2 space-y-1 text-xs">
                        <div className={`flex items-center gap-1 ${passwordRequirements.minLength ? "text-green-600" : "text-muted-foreground"}`}>
                          {passwordRequirements.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>At least 6 characters</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordRequirements.hasLowercase ? "text-green-600" : "text-muted-foreground"}`}>
                          {passwordRequirements.hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>One lowercase letter (a-z)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordRequirements.hasUppercase ? "text-green-600" : "text-muted-foreground"}`}>
                          {passwordRequirements.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>One uppercase letter (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordRequirements.hasDigit ? "text-green-600" : "text-muted-foreground"}`}>
                          {passwordRequirements.hasDigit ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>One digit (0-9)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordRequirements.hasNonAlphanumeric ? "text-green-600" : "text-muted-foreground"}`}>
                          {passwordRequirements.hasNonAlphanumeric ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>One special character (!@#$%^&*)</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword && (
                      <div className={`flex items-center gap-1 text-xs ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                        {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</span>
                      </div>
                    )}
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Change Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MFA Tab */}
          <TabsContent value="mfa">
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {twoFactorInfo?.isTwoFactorEnabled ? (
                  <div className="space-y-4">
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Two-factor authentication is currently <strong>enabled</strong> on your account.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label>Recovery Codes Remaining</Label>
                      <div className="text-2xl font-bold">{twoFactorInfo.recoveryCodesLeft}</div>
                      <p className="text-sm text-muted-foreground">
                        Use recovery codes to access your account if you lose your authenticator device.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleResetRecoveryCodes} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Reset Recovery Codes
                      </Button>
                      <Button variant="destructive" onClick={handleDisable2FA} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Disable 2FA
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Two-factor authentication is currently <strong>disabled</strong>. Enable it to secure your account.
                      </AlertDescription>
                    </Alert>

                    {twoFactorInfo && (
                      <>
                        <div className="space-y-2">
                          <Label>Step 1: Scan QR Code</Label>
                          <p className="text-sm text-muted-foreground">
                            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                          </p>
                          <div className="flex justify-center p-4 bg-white rounded-lg">
                            <QRCodeSVG value={qrCodeUrl} size={200} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Or enter this key manually</Label>
                          <div className="flex gap-2">
                            <Input value={twoFactorInfo.sharedKey} readOnly />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(twoFactorInfo.sharedKey);
                                toast({ title: "Copied", description: "Key copied to clipboard" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <form onSubmit={handleEnable2FA} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="mfa-code">Step 2: Enter Verification Code</Label>
                            <Input
                              id="mfa-code"
                              type="text"
                              placeholder="Enter 6-digit code"
                              value={mfaCode}
                              onChange={(e) => setMfaCode(e.target.value)}
                              maxLength={6}
                            />
                          </div>
                          <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Enable Two-Factor Authentication
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                )}

                {showRecoveryCodes && recoveryCodes.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">Save your recovery codes!</p>
                        <p className="text-sm">
                          Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
                        </p>
                        <div className="bg-muted p-3 rounded font-mono text-sm space-y-1">
                          {recoveryCodes.map((code, index) => (
                            <div key={index}>{code}</div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={copyRecoveryCodes}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Codes
                          </Button>
                          <Button variant="outline" size="sm" onClick={downloadRecoveryCodes}>
                            <Download className="h-4 w-4 mr-2" />
                            Download Codes
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setShowRecoveryCodes(false)}>
                            Close
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
