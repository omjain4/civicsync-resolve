import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, FileText, BarChart3, User as UserIcon, LogOut, X, Menu } from "lucide-react";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const isHomePage = location.pathname === "/";
  const isLoginPage = location.pathname === "/login";

  const navigation = [
    { name: "Report Issue", href: "/report", icon: FileText, show: isAuthenticated && user?.role !== "admin" },
    { name: "View Map", href: "/map", icon: MapPin, show: isAuthenticated },
    { name: "My Issues", href: "/my-issues", icon: FileText, show: isAuthenticated && user?.role !== "admin" },
    { name: "My Profile", href: "/profile", icon: UserIcon, show: isAuthenticated },
    { name: "Dashboard", href: "/admin", icon: BarChart3, show: isAuthenticated && user?.role === "admin" },
    { name: "Analytics", href: "/analytics", icon: BarChart3, show: isAuthenticated && user?.role === "admin" },
    { name: "Assignment Board", href: "/assignment-board", icon: BarChart3, show: isAuthenticated && user?.role === "admin" }
  ];
  const visibleNavigation = navigation.filter(item => item.show);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate("/login");
  };

  // Home OR login: Always show topbar
  if (isHomePage || isLoginPage) {
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
              <div className="rounded bg-white p-2 shadow-inner">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <span className={cn("uppercase font-bold text-xl", isHomePage ? "text-white" : "text-primary")}>Civicsync</span>
            </Link>
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-2">
              <nav className="flex items-center gap-1">
                {visibleNavigation.map(item => (
                  <Button key={item.name} asChild variant="ghost"
                    className={cn(isHomePage ? "text-white hover:bg-white/10" : "text-foreground/70")}>
                    <Link to={item.href}>{item.name}</Link>
                  </Button>
                ))}
              </nav>
              <div className="flex items-center gap-4">
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
                    <Button variant="ghost" size="icon" onClick={handleLogout}
                      className={cn(isHomePage ? "text-white" : "text-foreground/70")}>
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild><Link to="/report">Report Issue</Link></Button>
                    <Button asChild variant="outline"
                      className={cn(isHomePage ? "border-white text-blue hover:bg-white/10" : "")}>
                      <Link to="/login">Sign In</Link></Button>
                  </>
                )}
              </div>
            </div>
            {/* Mobile hamburger button */}
            <Button variant="ghost" size="icon" className={cn("md:hidden", isHomePage ? "text-white" : "text-primary")}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
          {/* Mobile Drawer/Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 top-[60px] z-50 bg-black/70 backdrop-blur-sm">
              <nav className="absolute right-0 top-0 w-64 bg-white/95 shadow-lg flex flex-col h-full">
                <div className="flex flex-col px-4 py-5 gap-3">
                  {visibleNavigation.map(item => (
                    <Link key={item.name} to={item.href}
                      className="flex items-center gap-3 py-2 px-3 rounded hover:bg-blue-100 text-primary font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                  <div className="flex flex-col gap-3 my-3">
                    {isAuthenticated && user ? (
                      <>
                        <div className="flex items-center gap-2">
                          <img src={user.profilePhoto} alt={user.username}
                            className="rounded-full w-8 h-8 border-2 border-primary/50"/>
                          <span className="font-medium">{user.username}</span>
                        </div>
                        <Button variant="outline" onClick={handleLogout}>Logout</Button>
                      </>
                    ) : (
                      <>
                        <Button asChild variant="outline" onClick={() => setMobileMenuOpen(false)}>
                          <Link to="/login">Sign In</Link>
                        </Button>
                        <Button asChild onClick={() => setMobileMenuOpen(false)}>
                          <Link to="/report">Report Issue</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </nav>
              <div className="absolute top-0 left-0 w-full h-full" onClick={() => setMobileMenuOpen(false)}></div>
            </div>
          )}
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

  // ADMIN: Center nav, user menu right, mobile hamburger toggles panel
  if (isAuthenticated && user?.role === "admin") {
    return (
      <div className="min-h-screen bg-[#eaf4fb] flex flex-col">
        <header className="flex items-center py-4 px-4 md:px-8 shadow bg-[#eaf4fb] border-b">
          <Button variant="ghost" size="icon" className="md:hidden mr-2"
            onClick={() => setMobileMenuOpen(v => !v)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
          <div className="flex-1 flex justify-center">
            <nav className="flex gap-5 md:gap-10 font-semibold text-lg">
              <Link to="/admin" className={cn("hover:text-[#0277bd]", location.pathname === "/admin" && "text-[#0277bd] font-bold")}>Dashboard</Link>
              <Link to="/assignment-board" className={cn("hover:text-[#0277bd]", location.pathname === "/assignment-board" && "text-[#0277bd] font-bold")}>Assignment Board</Link>
              <Link to="/analytics" className={cn("hover:text-[#0277bd]", location.pathname === "/analytics" && "text-[#0277bd] font-bold")}>Analytics</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 md:gap-4 justify-end">
            <span className="hidden sm:block text-sm font-bold text-[#227be3] text-right">
              {user?.username}<div className="block text-xs text-black font-normal">{user?.email}</div>
            </span>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-blue-300 bg-white">
              <img src={user.profilePhoto || "/default-profile.png"} alt={user.username || 'Admin'}
                className="w-full h-full object-cover" />
            </div>
            <Button size="icon" variant="ghost" onClick={handleLogout}><LogOut className="w-5 h-5" /></Button>
          </div>
          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="fixed top-0 left-0 w-full h-full bg-black/70 z-50" onClick={() => setMobileMenuOpen(false)}>
              <div className="absolute top-12 right-0 w-2/3 max-w-xs bg-white shadow-lg p-6 flex flex-col gap-4">
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                <Link to="/assignment-board" onClick={() => setMobileMenuOpen(false)}>Assignment Board</Link>
                <Link to="/analytics" onClick={() => setMobileMenuOpen(false)}>Analytics</Link>
                <hr />
                <span>{user?.username}<br /><span className="text-xs text-black">{user?.email}</span></span>
                <Button variant="destructive" onClick={handleLogout}>Logout</Button>
              </div>
            </div>
          )}
        </header>
        <main className="flex-1 p-4 md:p-10">{children}</main>
      </div>
    );
  }

  // Sidebar for normal users, mobile drawer for small screens
  return (
    <div className="min-h-screen bg-[#eaf4fb] flex">
      {/* Desktop Sidebar */}
      <aside className={cn("fixed z-40 top-0 left-0 h-screen w-64 flex-col bg-[#0a2679] text-white shadow-xl hidden lg:flex")}>
        <Link to="/" className="flex items-center gap-2 px-4 py-5 border-b border-white/10 hover:opacity-80 transition">
          <MapPin className="w-6 h-6 text-[#5e94fc]" />
          <span className="font-extrabold text-xl tracking-wide">CivicSync</span>
        </Link>
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
          {visibleNavigation.map(item => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg hover:bg-blue-900/60 transition",
                location.pathname.startsWith(item.href)
                  ? "bg-blue-900/80 font-bold"
                  : "bg-transparent"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t border-white/10">
          {isAuthenticated && user && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full overflow-hidden w-10 h-10 border-2 border-blue-200">
                  <img
                    src={user.profilePhoto || "/default-profile.png"}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-bold">{user.username}</div>
                  <div className="text-xs text-blue-100">{user.email}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full text-left text-white hover:bg-blue-700"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-1 inline" /> Logout
              </Button>
              <Link to="/settings" className="block mt-2 text-sm text-blue-200 hover:underline">
                Settings
              </Link>
              <Link to="/help" className="block mt-1 text-sm text-blue-200 hover:underline">
                Help & Support
              </Link>
            </>
          )}
        </div>
      </aside>
      {/* Mobile Drawer for sidebar */}
      <div className="lg:hidden">
        <Button variant="ghost" size="icon" className="fixed top-3 left-3 z-50 bg-[#0a2679] text-white" onClick={() => setMobileMenuOpen(true)}>
          <Menu />
        </Button>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setMobileMenuOpen(false)}>
            <aside className="absolute top-0 left-0 h-screen w-64 bg-[#0a2679] text-white flex flex-col">
              <Button variant="ghost" size="icon" className="self-end m-4" onClick={() => setMobileMenuOpen(false)}>
                <X />
              </Button>
              <Link to="/" className="flex items-center gap-2 px-4 py-5 border-b border-white/10 hover:opacity-80 transition"
                onClick={() => setMobileMenuOpen(false)}>
                <MapPin className="w-6 h-6 text-[#5e94fc]" />
                <span className="font-extrabold text-xl tracking-wide">CivicSync</span>
              </Link>
              <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
                {visibleNavigation.map(item => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg hover:bg-blue-900/60 transition",
                      location.pathname.startsWith(item.href)
                        ? "bg-blue-900/80 font-bold"
                        : "bg-transparent"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>
              <div className="mt-auto p-4 border-t border-white/10">
                {isAuthenticated && user && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="rounded-full overflow-hidden w-10 h-10 border-2 border-blue-200">
                        <img
                          src={user.profilePhoto || "/default-profile.png"}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-bold">{user.username}</div>
                        <div className="text-xs text-blue-100">{user.email}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full text-left text-white hover:bg-blue-700"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-1 inline" /> Logout
                    </Button>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
      <main className={cn("flex-1 min-h-screen bg-[#f6fafd] p-4 md:p-10", "lg:ml-64")}>
        {children}
      </main>
    </div>
  );
}
