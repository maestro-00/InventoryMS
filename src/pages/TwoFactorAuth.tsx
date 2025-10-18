import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { verify2FALogin, verify2FARecoveryCode } from "@/services/authService";
import { Loader2, ShieldCheck } from "lucide-react";

const TwoFactorAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { refreshSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  // Get email and password from location state (passed from login page)
  const email = location.state?.email;
  const password = location.state?.password;

  // Redirect back to login if no email or password in state
  if (!email || !password) {
    navigate("/auth", { replace: true });
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!useRecoveryCode && code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    if (useRecoveryCode && !recoveryCode.trim()) {
      toast({
        title: "Invalid Recovery Code",
        description: "Please enter a recovery code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = useRecoveryCode 
      ? await verify2FARecoveryCode(email, password, recoveryCode.trim())
      : await verify2FALogin(email, password, code);

    if (error) {
      toast({
        title: "Verification Failed",
        description: error.message || `Invalid ${useRecoveryCode ? 'recovery code' : 'verification code'}. Please try again.`,
        variant: "destructive",
      });
      setLoading(false);
      if (useRecoveryCode) {
        setRecoveryCode("");
      } else {
        setCode("");
      }
    } else {
      // Refresh session to update AuthContext
      await refreshSession();
      
      toast({
        title: "Success",
        description: "Signed in successfully!",
      });
      
      setLoading(false);
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            {useRecoveryCode 
              ? "Enter one of your recovery codes"
              : "Enter the 6-digit code from your authenticator app"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            {!useRecoveryCode ? (
              <div className="flex flex-col items-center space-y-4">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => setCode(value)}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                
                <p className="text-sm text-muted-foreground text-center">
                  Logged in as: <span className="font-medium">{email}</span>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-code">Recovery Code</Label>
                  <Input
                    id="recovery-code"
                    type="text"
                    placeholder="Enter recovery code"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>
                
                <p className="text-sm text-muted-foreground text-center">
                  Logged in as: <span className="font-medium">{email}</span>
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || (!useRecoveryCode && code.length !== 6) || (useRecoveryCode && !recoveryCode.trim())}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Verify"
              )}
            </Button>

            <div className="flex flex-col items-center space-y-2">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setUseRecoveryCode(!useRecoveryCode);
                  setCode("");
                  setRecoveryCode("");
                }}
                disabled={loading}
                className="text-sm"
              >
                {useRecoveryCode 
                  ? "Use authenticator app instead" 
                  : "Use recovery code instead"
                }
              </Button>
              
              <Button
                type="button"
                variant="link"
                onClick={() => navigate("/auth")}
                disabled={loading}
                className="text-sm text-muted-foreground"
              >
                Back to login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TwoFactorAuth;
