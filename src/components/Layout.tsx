import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, FileText, BarChart3, User, LogOut, Menu, X } from "lucide-react";
import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading, logout } = useAuth();

  const isHomePage = location.pathname === '/';

  const navigation = [
    { name: "Report Issue", href: "/report", show: isAuthenticated && (isLoading || !user ? true : user.role !== "admin") },
    { name: "View Map", href: "/map", show: isAuthenticated },
    { name: "My Issues", href: "/my-issues", show: isAuthenticated && (isLoading || !user ? true : user.role !== "admin") },
    { name: "My Profile", href: "/profile", show: isAuthenticated },
    { name: "Dashboard", href: "/admin", show: isAuthenticated && user?.role === "admin" },
    { name: "Analytics", href: "/analytics", show: isAuthenticated && user?.role === "admin" },
  ];

  const visibleNavigation = navigation.filter(item => item.show);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className={cn(
        "py-5 w-full z-30 transition-colors sticky top-0",
        isHomePage 
          ? "bg-gradient-to-b from-black/60 to-transparent" 
          : "bg-white/95 border-b border-blue-100 shadow"
      )}>
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="rounded bg-white px-2.5 py-1 group-hover:bg-blue-100 transition">
              <MapPin className="w-6 h-6 text-blue-800" />
            </div>
            <span className={cn(
              "uppercase tracking-wider font-bold text-lg md:text-2xl",
              isHomePage ? "text-white" : "text-blue-900"
            )}>
              Civicsync
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center space-x-2">
              {visibleNavigation.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition-all",
                      isHomePage ? "text-white hover:bg-white/10" : "text-blue-800 hover:bg-blue-50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <div className={cn("hidden sm:block text-sm", isHomePage ? "text-white" : "text-blue-900")}>
                    <span className="font-semibold">{user?.email}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className={cn(isHomePage ? "text-white hover:text-white/10" : "text-blue-700 hover:text-blue-900")} title="Sign Out">
                    <LogOut className="w-5 h-5" />
                  </Button>
                </>
              ) : (
                // --- CORRECTED STRUCTURE ---
                // Each button is now separate, and both are wrapped in a React Fragment <>
                <>
                  <Button asChild className={cn( isHomePage ? "bg-white text-blue-900 hover:bg-blue-100" : "bg-primary text-primary-foreground")}>
                    <Link to="/report">Report Issue</Link>
                  </Button>
                  <Button asChild className={cn( isHomePage ? "bg-white text-blue-900 hover:bg-blue-100" : "bg-primary text-primary-foreground")}>
                    <Link to="/report">Sign in</Link>
                  </Button>
                </>
              )}
            </div>

            <Button variant="ghost" size="icon" className={cn("md:hidden", isHomePage ? "text-white" : "text-primary")} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white w-full absolute left-0 right-0 z-50 shadow-lg">
            <div className="container mx-auto py-2 px-4">
              <nav className="flex flex-col space-y-1">
                {visibleNavigation.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.name} to={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium text-blue-800 hover:bg-blue-50">
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                <div className="py-2" />
                {isAuthenticated ? (
                  <div className="flex items-center gap-2 w-full border-t pt-3 mt-2">
                    <div className="flex-1"><p className="font-medium text-sm">{user?.email}</p></div>
                    <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Sign Out</Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mt-2 border-t pt-3">
                    <Button asChild className="bg-primary text-primary-foreground"><Link to="/report">Report Issue</Link></Button>
                    <Button asChild variant="outline"><Link to="/login">Sign In</Link></Button>
                  </div>
                )}
              </nav>
            </div>
          </div>
        )}
      </header>

      <main className={cn("flex-1 w-full", isHomePage && "-mt-[88px]")}>
        {children}
      </main>

      <footer className="py-8 bg-white border-t border-blue-100 w-full">
        <div className="container mx-auto px-4 text-sm text-blue-700 text-center">
          &copy; {new Date().getFullYear()} CivicSync Cell. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}