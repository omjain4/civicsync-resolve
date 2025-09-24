import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, FileText, BarChart3, User as UserIcon, LogOut, Menu, X } from "lucide-react";
import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const isHomePage = location.pathname === '/';

  const navigation = [
    { name: "Report Issue", href: "/report", icon: FileText, show: isAuthenticated && user?.role !== "admin" },
    { name: "View Map", href: "/map", icon: MapPin, show: isAuthenticated },
    { name: "My Issues", href: "/my-issues", icon: FileText, show: isAuthenticated && user?.role !== "admin" },
    { name: "My Profile", href: "/profile", icon: UserIcon, show: isAuthenticated },
    { name: "Dashboard", href: "/admin", icon: BarChart3, show: isAuthenticated && user?.role === "admin" },
    { name: "Analytics", href: "/analytics", icon: BarChart3, show: isAuthenticated && user?.role === "admin" },
  ];
  const visibleNavigation = navigation.filter(item => item.show);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className={cn(
        "py-4 w-full z-30 transition-colors sticky top-0",
        isHomePage 
          ? "bg-gradient-to-b from-black/60 to-transparent" 
          : "bg-white/95 border-b shadow-sm"
      )}>
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="rounded bg-white p-2 shadow-inner"><MapPin className="w-6 h-6 text-primary" /></div>
            <span className={cn("uppercase font-bold text-xl", isHomePage ? "text-white" : "text-primary")}>Civicsync</span>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-1">
              {visibleNavigation.map(item => (
                <Button key={item.name} asChild variant="ghost" className={cn(isHomePage ? "text-white hover:bg-white/10" : "text-foreground/70")}>
                  <Link to={item.href}>{item.name}</Link>
                </Button>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/50">
                      <img src={user.profilePhoto} alt={user.username} className="w-full h-full object-cover"/>
                    </div>
                    <div className={cn("text-sm font-semibold", isHomePage ? "text-white" : "text-foreground")}>
                      {user.username}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className={cn(isHomePage ? "text-white" : "text-foreground/70")}>
                    <LogOut className="w-5 h-5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild><Link to="/report">Report Issue</Link></Button>
                  <Button asChild variant="outline" className={cn(isHomePage ? "border-white text-blue hover:bg-white/10" : "")}>
                  <Link to="/login">Sign In</Link></Button>
                </>
              )}
            </div>
            
            <Button variant="ghost" size="icon" className={cn("md:hidden", isHomePage ? "text-white" : "text-primary")} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>
      
      <main className={cn("flex-1 w-full", isHomePage && "pt-0 -mt-[92px]")}>
        {children}
      </main>

      <footer className="py-6 bg-white border-t">
        <div className="container mx-auto text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} CivicSync Cell. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}