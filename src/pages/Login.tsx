import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Mail, Phone, Lock, Camera, User, Shield, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Layout } from "@/components/Layout";

const LoginForm = ({ loginEmail, setLoginEmail, loginPassword, setLoginPassword, handleLogin, isLoading }: any) => (
  <form onSubmit={handleLogin} className="space-y-5">
    <div className="space-y-2">
      <Label htmlFor="email" className="text-xs uppercase tracking-widest font-semibold text-gray-500">Email</Label>
      <div className="relative">
        <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
        <Input id="email" type="email" placeholder="Enter your email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="pl-10 py-3" disabled={isLoading} />
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="password" className="text-xs uppercase tracking-widest font-semibold text-gray-500">Password</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
        <Input id="password" type="password" placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="pl-10 py-3" disabled={isLoading} />
      </div>
    </div>
    <button type="submit" className="btn-accent w-full" disabled={isLoading}>
      {isLoading ? "Signing In..." : "Sign In"}
    </button>
  </form>
);

function LoginPageContent() {
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
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
      navigate(user.role === 'admin' ? '/admin' : '/profile');
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); if (isLoading) return; setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email: loginEmail, password: loginPassword });
      const userData = response.data.user;
      login(response.data.token, userData);
      toast({ title: "Login Successful!" });
      navigate(userData.role === 'admin' ? '/admin' : '/profile');
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.response?.data?.message || "Invalid credentials.", variant: "destructive" });
    } finally { setIsLoading(false); }
  }, [loginEmail, loginPassword, login, toast, navigate, isLoading]);

  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== signupConfirmPassword) return toast({ title: "Password Mismatch", variant: "destructive" });
    if (isLoading) return; setIsLoading(true);
    const formData = new FormData();
    formData.append('username', signupUsername); formData.append('email', signupEmail);
    formData.append('phone', signupPhone); formData.append('password', signupPassword);
    if (signupProfilePhoto) formData.append('profilePhoto', signupProfilePhoto);
    try {
      const response = await api.post('/auth/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      login(response.data.token, response.data.user);
      toast({ title: "Account Created!" }); navigate('/profile');
    } catch (error: any) {
      toast({ title: "Signup Failed", description: error.response?.data?.message || "Could not create account.", variant: "destructive" });
    } finally { setIsLoading(false); }
  }, [signupUsername, signupEmail, signupPhone, signupPassword, signupConfirmPassword, signupProfilePhoto, login, toast, navigate, isLoading]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSignupProfilePhoto(file); setPhotoPreview(URL.createObjectURL(file)); }
  };

  return (
    <div className="min-h-screen bg-[#F3F2EE] animate-page-in">
      <div className="container mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 max-w-5xl mx-auto items-center">
          {/* Left — branding */}
          <div className="hidden md:block">
            <p className="section-label mb-4">Secure Portal</p>
            <h1 className="display-lg mb-6">
              Welcome<br />
              <span className="text-[#D52E25]">Back</span>
            </h1>
            <p className="text-xs uppercase tracking-wider text-gray-500 leading-relaxed max-w-sm">
              Sign in to report civic issues, track your complaints, and help improve your community infrastructure.
            </p>
            <div className="mt-12 space-y-6">
              {[
                { icon: MapPin, title: "Easy Reporting", desc: "Report civic issues with automatic location" },
                { icon: Mail, title: "Stay Updated", desc: "Get notifications on issue progress" },
                { icon: Users, title: "Community Impact", desc: "Work together to improve your city" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#D52E25] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider">{title}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div className="ed-card bg-white p-8 md:p-10">
            <h2 className="font-bold text-xl uppercase tracking-wider mb-1">Sign In</h2>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-6">Choose your account type</p>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100">
                <TabsTrigger value="login" className="text-xs uppercase tracking-wider font-semibold">Citizen</TabsTrigger>
                <TabsTrigger value="admin-login" className="text-xs uppercase tracking-wider font-semibold">Admin</TabsTrigger>
                <TabsTrigger value="signup" className="text-xs uppercase tracking-wider font-semibold">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginForm loginEmail={loginEmail} setLoginEmail={setLoginEmail} loginPassword={loginPassword} setLoginPassword={setLoginPassword} handleLogin={handleLogin} isLoading={isLoading} />
                <p className="text-center text-xs text-gray-400 mt-4 uppercase tracking-wider">
                  No account? <button type="button" onClick={() => setActiveTab('signup')} className="text-[#D52E25] font-semibold hover:underline">Sign up</button>
                </p>
              </TabsContent>

              <TabsContent value="admin-login">
                <div className="bg-amber-50 border border-amber-200 p-3 mb-4">
                  <p className="text-xs text-amber-800 text-center font-semibold uppercase tracking-wider">🔐 Administrator access only</p>
                </div>
                <LoginForm loginEmail={loginEmail} setLoginEmail={setLoginEmail} loginPassword={loginPassword} setLoginPassword={setLoginPassword} handleLogin={handleLogin} isLoading={isLoading} />
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="flex flex-col items-center space-y-2">
                    <Label htmlFor="profilePhoto" className="cursor-pointer">
                      <div className="w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-[#D52E25] transition-colors">
                        {photoPreview ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-gray-400" />}
                      </div>
                    </Label>
                    <input id="profilePhoto" type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    <Button type="button" variant="link" size="sm" onClick={() => photoInputRef.current?.click()} className="text-xs uppercase tracking-wider">Add Photo</Button>
                  </div>
                  {[
                    { id: "signup-username", label: "Username", icon: User, value: signupUsername, setter: setSignupUsername, type: "text", ph: "Choose a username" },
                    { id: "signup-email", label: "Email", icon: Mail, value: signupEmail, setter: setSignupEmail, type: "email", ph: "Enter email" },
                    { id: "phone", label: "Phone", icon: Phone, value: signupPhone, setter: setSignupPhone, type: "tel", ph: "Phone number" },
                    { id: "signup-password", label: "Password", icon: Lock, value: signupPassword, setter: setSignupPassword, type: "password", ph: "Create password" },
                    { id: "confirm-password", label: "Confirm Password", icon: Lock, value: signupConfirmPassword, setter: setSignupConfirmPassword, type: "password", ph: "Confirm password" },
                  ].map(({ id, label, icon: Icon, value, setter, type, ph }) => (
                    <div key={id} className="space-y-1.5">
                      <Label htmlFor={id} className="text-xs uppercase tracking-widest font-semibold text-gray-500">{label}</Label>
                      <div className="relative">
                        <Icon className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        <Input id={id} type={type} placeholder={ph} value={value} onChange={(e) => setter(e.target.value)} required className="pl-10 py-3" disabled={isLoading} />
                      </div>
                    </div>
                  ))}
                  <button type="submit" className="btn-accent w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return <Layout><LoginPageContent /></Layout>;
}
