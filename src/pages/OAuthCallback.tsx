import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { refreshSession } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      // Check for error in URL params
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || error || 'OAuth authentication failed');
        toast({
          title: "Authentication Failed",
          description: errorDescription || error,
          variant: "destructive",
        });
        return;
      }

      // Check if this is a linking operation (user is already authenticated)
      const isLinking = searchParams.get('action') === 'link';
      
      try {
        // The backend should have set the authentication cookie
        // We just need to refresh the session
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await refreshSession();
        
        // Check if session was established successfully
        // Give a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setStatus('success');
        
        if (isLinking) {
          toast({
            title: "Success",
            description: "External account linked successfully!",
          });
          // Redirect to settings after linking
          setTimeout(() => navigate("/settings"), 1500);
        } else {
          toast({
            title: "Success",
            description: "Signed in successfully!",
          });
          // Redirect to dashboard after sign-in
          setTimeout(() => navigate("/"), 1500);
        }
      } catch (err) {
        setStatus('error');
        const message = err instanceof Error ? err.message : 'Failed to complete authentication';
        setErrorMessage(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast, refreshSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <div className="p-3 bg-primary rounded-full">
                <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="p-3 bg-green-500 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
            )}
            {status === 'error' && (
              <div className="p-3 bg-destructive rounded-full">
                <XCircle className="h-8 w-8 text-destructive-foreground" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && "Completing Authentication..."}
            {status === 'success' && "Authentication Successful"}
            {status === 'error' && "Authentication Failed"}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && "Please wait while we complete your sign-in"}
            {status === 'success' && "Redirecting you now..."}
            {status === 'error' && errorMessage}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/auth")} variant="default">
              Back to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default OAuthCallback;
