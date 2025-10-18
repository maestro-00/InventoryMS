import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp, signInWithGoogle, getUserInfo } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Package, Loader2, Check, X } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "", 
    name: ""
  });
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  const getPasswordRequirements = (password: string) => {
    return {
      minLength: password.length >= 6,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNonAlphanumeric: /[^a-zA-Z0-9]/.test(password),
      hasDigit: /\d/.test(password),
    };
  };

  const validatePassword = (password: string): string | null => {
    const requirements = getPasswordRequirements(password);
    
    if (!requirements.minLength) {
      return "Password must be at least 6 characters long";
    }
    if (!requirements.hasLowercase) {
      return "Password must have at least one lowercase letter ('a'-'z')";
    }
    if (!requirements.hasUppercase) {
      return "Password must have at least one uppercase letter ('A'-'Z')";
    }
    if (!requirements.hasNonAlphanumeric) {
      return "Password must have at least one non-alphanumeric character (e.g., !, @, #, $, %, etc.)";
    }
    if (!requirements.hasDigit) {
      return "Password must have at least one digit ('0'-'9')";
    }
    return null;
  };

  const passwordRequirements = getPasswordRequirements(signUpData.password);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!signUpData.name || !signUpData.email || !signUpData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Validate password
    const passwordError = validatePassword(signUpData.password);
    if (passwordError) {
      toast({
        title: "Invalid Password",
        description: passwordError,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await signUp(signUpData.name,signUpData.email, signUpData.password);

    if (error) {
      // Format validation errors if present
      let errorDescription = error.message;
      if ('errors' in error && error.errors) {
        const errorMessages = Object.entries(error.errors)
          .map(([field, messages]) => {
            const msgArray = Array.isArray(messages) ? messages : [messages];
            return `${field}: ${msgArray.join(', ')}`;
          })
          .join('\n');
        errorDescription = errorMessages || error.message;
      }
      
      toast({
        title: "Error",
        description: errorDescription,
        variant: "destructive",
      });
      setLoading(false);
    } else {
      // Refresh session to update AuthContext
      await refreshSession();
      
      toast({
        title: "Success",
        description: "Account created successfully! You can now login with your credentials",
      });
      
      // Show email verification notification
      setTimeout(() => {
        toast({
          title: "Verify Your Email",
          description: "Please check your email and verify your address. You can still use the app without verification.",
          duration: 7000,
        });
      }, 1000);
      
      setLoading(false);
      navigate("/");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!signInData.email || !signInData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await signIn(signInData.email, signInData.password);
    if (error) {
      // Check if 2FA is required
      if (error.status === 401 && error.message === "RequiresTwoFactor") {
        setLoading(false);
        navigate("/auth/2fa", { state: { email: signInData.email, password: signInData.password } });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    } else {
      // Refresh session to update AuthContext
      await refreshSession();
      
      toast({
        title: "Success",
        description: "Signed in successfully!",
      });
      
      // Check email verification status and show notification if not verified
      const { data: userInfo } = await getUserInfo(); 
      if (userInfo && !userInfo.isEmailConfirmed) {
        setTimeout(() => {
          toast({
            title: "Email Not Verified",
            description: "Please verify your email address. You can still use the app, but some features may be limited.",
            duration: 7000,
          });
        }, 1000);
      }
      
      setLoading(false);
      navigate("/");
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Package className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Inventory POS</CardTitle>
          <CardDescription>Manage your inventory and sales efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Password</Label>
                    <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">              
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Name"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                  />
                  {signUpData.password && (
                    <div className="mt-2 space-y-1 text-xs">
                      <div className={`flex items-center gap-1 ${passwordRequirements.minLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordRequirements.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>At least 6 characters</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordRequirements.hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordRequirements.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordRequirements.hasDigit ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordRequirements.hasDigit ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>One digit (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordRequirements.hasNonAlphanumeric ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passwordRequirements.hasNonAlphanumeric ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>One special character (!@#$%^&*)</span>
                      </div>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
