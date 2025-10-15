import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { confirmEmail } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle, XCircle, Package } from "lucide-react";

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const userId = searchParams.get("userId");
      const code = searchParams.get("code");
      const changedEmail = searchParams.get("changedEmail");

      if (!userId || !code) {
        setStatus("error");
        setErrorMessage("Invalid verification link. Missing required parameters.");
        return;
      }

      const { error } = await confirmEmail(
        userId,
        code,
        changedEmail || undefined
      );

      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
      } else {
        setStatus("success");
        // Refresh session to update email confirmation status
        await refreshSession();
      }
    };

    verifyEmail();
  }, [searchParams, refreshSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Package className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription>Confirming your email address</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Verifying your email address...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-600" />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Email Verified!</h3>
                <p className="text-muted-foreground">
                  Your email address has been successfully verified.
                </p>
              </div>
              <Button onClick={() => navigate("/")} className="w-full">
                Go to Dashboard
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Verification Failed</h3>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Button onClick={() => navigate("/settings")} className="w-full">
                  Go to Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerification;
