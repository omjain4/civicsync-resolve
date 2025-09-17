import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, FileText, BarChart3, User, LogOut, Menu, X, Home } from "lucide-react";
import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navigation = [
    //{ name: "Home", href: "/", icon: Home, show: true },
    {
      name: "Report Issue",
      href: "/report",
      icon: FileText,
      show:
        isAuthenticated &&
        (isLoading || !user ? true : user.role !== "admin"),
    },
     {
    name: "View Map",
    href: "/map", 
    icon: MapPin,
    show: isAuthenticated, // Only show when logged in
  },
    {
      name: "My Issues",
      href: "/my-issues",
      icon: FileText,
      show:
        isAuthenticated &&
        (isLoading || !user ? true : user.role !== "admin"),
    },
    { name: "My Profile", href: "/profile", icon: User, show: isAuthenticated },
    { name: "Dashboard", href: "/admin", icon: BarChart3, show: isAuthenticated && user?.role === "admin" },
    { name: "Analytics", href: "/analytics", icon: BarChart3, show: isAuthenticated && user?.role === "admin" },
  ];

  const visibleNavigation = navigation.filter(item => item.show);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">

      {/* OFFICIAL GOV HEADER */}
      <header className="bg-white/95 border-b border-blue-100 shadow py-5">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 group cursor-pointer">
  <div className="rounded bg-blue-800 px-2.5 py-1 group-hover:bg-blue-900 transition">
    <MapPin className="w-6 h-6 text-white" />
  </div>
  <span className="uppercase tracking-wider font-bold text-blue-900 text-xl md:text-2xl">
    Civicsync
  </span>
  <span className="hidden md:block ml-3 text-sm text-blue-700/70 font-semibold italic">
    An official city platform
  </span>
</Link>


          <div className="flex items-center gap-4">

            {/* Navigation (desktop) */}
            <nav className="hidden md:flex items-center space-x-3">
              {visibleNavigation.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition-all",
                      isActive(item.href)
                        ? "bg-blue-100 text-blue-800"
                        : "text-blue-800 hover:bg-blue-50 hover:text-blue-900"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Officer sign in / user area */}
            <div>
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-sm text-blue-900">
                    <span className="font-semibold">{user?.email}</span>
                    <span className="ml-1 px-2 py-0.5 rounded bg-blue-100 text-xs uppercase tracking-wide">{user?.role === "admin" ? "Administrator" : "Citizen"}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="text-blue-700 hover:text-blue-900"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {/* Show separate “Report Issue” and “Officer Sign In” even to non-logged-in */}
                  <Button asChild className="rounded-none bg-blue-800 hover:bg-blue-900 text-white font-medium px-5">
                    <Link to="/report">Report Issue</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-none border-blue-800 text-blue-800 font-medium px-5">
                    <Link to="/login">Officer Sign In</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="container py-4">
              <nav className="flex flex-col space-y-2">
                {visibleNavigation.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-blue-100 text-blue-900"
                          : "text-blue-800 hover:bg-blue-50 hover:text-blue-900"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                {isAuthenticated && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="px-3 py-2">
                      <p className="font-medium text-sm">{user?.email}</p>
                      <span className="text-xs text-blue-700 uppercase">
                        {user?.role === 'admin' ? 'Administrator' : 'Citizen'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full justify-start px-3 mt-2 text-blue-700 hover:text-blue-900"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                )}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-10 bg-white border-t border-blue-100">
        <div className="container mx-auto px-4 flex justify-between items-center text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <div className="bg-blue-800 w-7 h-7 rounded flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold tracking-wide">CityGrievance Portal</span>
          </div>
          <div>&copy; {(new Date()).getFullYear()} CityGrievance Cell. Government of India.</div>
        </div>
      </footer>
    </div>
  );
}
