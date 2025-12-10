
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Camera, Mail, CheckCircle, Settings, ChevronDown, ChevronUp, HardDrive, Cloud, Wifi, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StorageSettings } from '@/components/StorageSettings';
import { CloudStorageSettings } from '@/components/CloudStorageSettings';
import { DuckDNSSettings } from '@/components/DuckDNSSettings';
import { FolderSettings } from '@/components/FolderSettings';
import { PiServiceSettings } from '@/components/PiServiceSettings';
import { SystemStatus } from '@/components/SystemStatus';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Storage settings state
  const [storageType, setStorageType] = useState<'cloud' | 'local'>('local');
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');
  const [dateOrganizedFolders, setDateOrganizedFolders] = useState(true);
  const [piVideoPath, setPiVideoPath] = useState('/home/pi/Videos');
  const [dateOrganizedFoldersPi, setDateOrganizedFoldersPi] = useState(true);
  
  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await signUp(email, password, fullName);
      
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(error.message);
        }
      } else {
        // Show email confirmation screen - user needs to verify their email
        setShowEmailSent(true);
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    }

    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the verification link before signing in.');
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else {
          setError(error.message);
        }
      } else {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in to your camera control system.",
        });
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    }

    setIsLoading(false);
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim(),
        options: { emailRedirectTo: `${window.location.origin}/` }
      } as any);
      if (error) {
        setError(error.message || 'Could not resend verification email. Please try again.');
      } else {
        toast({
          title: 'Verification email resent',
          description: `We’ve resent the verification link to ${email}.`,
        });
      }
    } catch (err: any) {
      setError('Unexpected error while resending verification email.');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      
      if (error) {
        setError(error.message);
      } else {
        setResetEmailSent(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }
    
    setIsLoading(false);
  };

  if (resetEmailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-foreground">Check Your Email</CardTitle>
            <CardDescription className="text-muted-foreground">
              We've sent a password reset link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Alert className="bg-primary/20 border-primary">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-primary-foreground">
                Click the link in your email to reset your password.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                setResetEmailSent(false);
                setShowForgotPassword(false);
              }}
            >
              Back to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
          This website is under construction to be able to connect multiple cameras. If you need to connect just one you can go to{' '}
          <a href="https://rpicamalert.xyz" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline">
            rpicamalert.xyz
          </a>
        </p>
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-foreground">Reset Password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-muted-foreground">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-foreground" 
              onClick={() => {
                setShowForgotPassword(false);
                setError('');
              }}
            >
              Back to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (showEmailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-foreground">Check Your Email</CardTitle>
            <CardDescription className="text-muted-foreground">
              We've sent a verification link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <Alert className="bg-primary/20 border-primary">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-primary-foreground">
                  Please click the verification link in your email to activate your account and access your camera control system.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or try signing up again.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              className="w-full"
              onClick={handleResend}
              disabled={isLoading}
            >
              {isLoading ? 'Resending...' : 'Resend verification email'}
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setShowEmailSent(false)}
            >
              Back to Sign Up
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
        This website is under construction to be able to connect multiple cameras. If you need to connect just one you can go to{' '}
        <a 
          href="https://rpicamalert.xyz" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 underline"
        >
          rpicamalert.xyz
        </a>
      </p>
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Camera className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-foreground">CamAlert</CardTitle>
          <CardDescription className="text-muted-foreground">
            Secure access to your remote camera system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger value="signin" className="text-muted-foreground data-[state=active]:text-foreground">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-muted-foreground data-[state=active]:text-foreground">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-muted-foreground">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
                <Button 
                  type="button" 
                  variant="link" 
                  className="w-full text-muted-foreground hover:text-primary"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                  }}
                >
                  Forgot password?
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-muted-foreground">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-muted-foreground">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-muted-foreground">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-muted-foreground">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  You'll receive an email to verify your account before you can sign in.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Settings Section */}
      <div className="w-full max-w-4xl mt-8">
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-between gap-2 border-border text-muted-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span>Configure Settings (Optional)</span>
              </div>
              {settingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Tabs defaultValue="storage" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-secondary mb-4">
                <TabsTrigger value="storage" className="flex items-center gap-1 text-xs sm:text-sm">
                  <HardDrive className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Storage</span>
                </TabsTrigger>
                <TabsTrigger value="cloud" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Cloud className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Cloud</span>
                </TabsTrigger>
                <TabsTrigger value="folder" className="flex items-center gap-1 text-xs sm:text-sm">
                  <FolderOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Folder</span>
                </TabsTrigger>
                <TabsTrigger value="pi" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Wifi className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Pi Service</span>
                </TabsTrigger>
                <TabsTrigger value="duckdns" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">DuckDNS</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="storage">
                <StorageSettings
                  storageType={storageType}
                  onStorageTypeChange={setStorageType}
                  quality={quality}
                  onQualityChange={setQuality}
                />
              </TabsContent>

              <TabsContent value="cloud">
                <CloudStorageSettings />
              </TabsContent>

              <TabsContent value="folder">
                <FolderSettings
                  storageType={storageType}
                  dateOrganizedFolders={dateOrganizedFolders}
                  onDateOrganizedToggle={setDateOrganizedFolders}
                  piVideoPath={piVideoPath}
                  onPiVideoPathChange={setPiVideoPath}
                  dateOrganizedFoldersPi={dateOrganizedFoldersPi}
                  onDateOrganizedTogglePi={setDateOrganizedFoldersPi}
                />
              </TabsContent>

              <TabsContent value="pi">
                <PiServiceSettings />
              </TabsContent>

              <TabsContent value="duckdns">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DuckDNSSettings />
                  <SystemStatus cameraConnected={false} />
                </div>
              </TabsContent>
            </Tabs>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default Auth;
