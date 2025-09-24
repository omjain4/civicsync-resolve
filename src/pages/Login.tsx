import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Mail, Phone, Lock, Camera, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Layout } from "@/components/Layout";

// Move LoginForm outside the main component to prevent re-creation
const LoginForm = ({ loginEmail, setLoginEmail, loginPassword, setLoginPassword, handleLogin, isLoading }) => (
  <form onSubmit={handleLogin} className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <div className="relative">
        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input 
          id="email" 
          type="email" 
          placeholder="Enter your email" 
          value={loginEmail} 
          onChange={(e) => setLoginEmail(e.target.value)} 
          required 
          className="pl-10"
          disabled={isLoading}
        />
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="password">Password</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input 
          id="password" 
          type="password" 
          placeholder="Enter your password" 
          value={loginPassword} 
          onChange={(e) => setLoginPassword(e.target.value)} 
          required 
          className="pl-10"
          disabled={isLoading}
        />
      </div>
    </div>
    <Button 
      type="submit" 
      className="w-full bg-gradient-civic hover:bg-primary-dark"
      disabled={isLoading}
    >
      {isLoading ? "Signing In..." : "Sign In"}
    </Button>
  </form>
);

function LoginPageContent() {
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  
  // Shared state for both login forms
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // --- NEW STATE FOR SIGN UP ---
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupProfilePhoto, setSignupProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await api.post('/auth/login', { 
        email: loginEmail, 
        password: loginPassword 
      });
      const userData = response.data.user;
      
      login(response.data.token, userData);
      toast({ title: "Login Successful!", description: "Welcome back." });
      
      // Redirect based on user role
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } catch (error) {
      toast({ 
        title: "Login Failed", 
        description: error.response?.data?.message || "Invalid credentials.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }, [loginEmail, loginPassword, login, toast, navigate, isLoading]);

  // --- UPDATED SIGN UP HANDLER ---
  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== signupConfirmPassword) {
      return toast({ title: "Password Mismatch", variant: "destructive" });
    }
    if (isLoading) return;
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('username', signupUsername);
    formData.append('email', signupEmail);
    formData.append('phone', signupPhone);
    formData.append('password', signupPassword);
    if (signupProfilePhoto) {
        formData.append('profilePhoto', signupProfilePhoto);
    }
    
    try {
      const response = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const userData = response.data.user;
      login(response.data.token, userData);
      toast({ title: "Account Created!", description: "Welcome to CivicSync." });
      navigate('/profile');
    } catch (error: any) {
      toast({ title: "Signup Failed", description: error.response?.data?.message || "Could not create account.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [signupUsername, signupEmail, signupPhone, signupPassword, signupConfirmPassword, signupProfilePhoto, login, toast, navigate, isLoading]);

  // --- NEW PHOTO HANDLER ---
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignupProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to CivicSync
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of citizens working together to improve their communities. 
            Sign in to report issues or create your account to get started.
          </p>
        </div>

        {/* Login Card */}
        <div className="max-w-md mx-auto">
          <Card className="shadow-civic-strong backdrop-blur-sm bg-white/95">
            <CardHeader>
              <CardTitle className="text-center">Sign In to Your Account</CardTitle>
              <CardDescription className="text-center">
                Choose your account type below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="login">Citizen</TabsTrigger>
                  <TabsTrigger value="admin-login">Admin</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <div className="space-y-4 pt-4">
                    <LoginForm 
                      loginEmail={loginEmail}
                      setLoginEmail={setLoginEmail}
                      loginPassword={loginPassword}
                      setLoginPassword={setLoginPassword}
                      handleLogin={handleLogin}
                      isLoading={isLoading}
                    />
                    <div className="text-center text-sm text-muted-foreground">
                      Don't have an account?{' '}
                      <button 
                        type="button"
                        onClick={() => setActiveTab('signup')}
                        className="text-primary hover:underline"
                      >
                        Sign up here
                      </button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="admin-login">
                  <div className="space-y-4 pt-4">
                    <div className="bg-accent/50 border border-primary/20 rounded-lg p-3 mb-4">
                      <p className="text-sm text-muted-foreground text-center">
                        🔐 Administrator access only
                      </p>
                    </div>
                    <LoginForm 
                      loginEmail={loginEmail}
                      setLoginEmail={setLoginEmail}
                      loginPassword={loginPassword}
                      setLoginPassword={setLoginPassword}
                      handleLogin={handleLogin}
                      isLoading={isLoading}
                    />
                  </div>
                </TabsContent>

                 <TabsContent value="signup" className="space-y-4 pt-4">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="flex flex-col items-center space-y-2">
                        <Label htmlFor="profilePhoto" className="cursor-pointer">
                            <div className="w-24 h-24 rounded-full bg-slate-100 border flex items-center justify-center overflow-hidden hover:bg-slate-200 transition-colors">
                                {photoPreview ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover"/> : <Camera className="w-8 h-8 text-slate-400"/>}
                            </div>
                        </Label>
                        <input id="profilePhoto" type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden"/>
                        <Button type="button" variant="link" size="sm" onClick={() => photoInputRef.current?.click()}>Add Profile Photo</Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-username">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input id="signup-username" placeholder="Choose a username" value={signupUsername} onChange={(e) => setSignupUsername(e.target.value)} required className="pl-10" disabled={isLoading}/>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input id="signup-email" type="email" placeholder="Enter your email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required className="pl-10" disabled={isLoading}/>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input id="phone" type="tel" placeholder="Enter your phone number" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} required className="pl-10" disabled={isLoading}/>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input id="signup-password" type="password" placeholder="Create a secure password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required className="pl-10" disabled={isLoading}/>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input id="confirm-password" type="password" placeholder="Confirm your password" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} required className="pl-10" disabled={isLoading}/>
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-gradient-civic hover:bg-primary-dark" disabled={isLoading}>
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Why Choose CivicSync?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Easy Reporting</h3>
              <p className="text-sm text-muted-foreground">
                Report civic issues with just a few clicks and automatic location detection
              </p>
            </Card>
            <Card className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Stay Updated</h3>
              <p className="text-sm text-muted-foreground">
                Get notifications about the progress of your reported issues
              </p>
            </Card>
            <Card className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Community Impact</h3>
              <p className="text-sm text-muted-foreground">
                Work together with your neighbors to improve your community
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main export with Layout wrapper
export default function Login() {
  return (
    <Layout>
      <LoginPageContent />
    </Layout>
  );
}
