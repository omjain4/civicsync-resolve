import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, FileText, BarChart3, User as UserIcon, LogOut, X, Menu, ClipboardList } from "lucide-react";
import { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "../context/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const isHomePage = location.pathname === "/";
  const isLoginPage = location.pathname === "/login";

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const navigation = [
    { name: "Report", href: "/report", icon: FileText, show: isAuthenticated && user?.role !== "admin" },
    { name: "Map", href: "/map", icon: MapPin, show: isAuthenticated },
    { name: "My Issues", href: "/my-issues", icon: ClipboardList, show: isAuthenticated && user?.role !== "admin" },
    { name: "Profile", href: "/profile", icon: UserIcon, show: isAuthenticated },
    { name: "Dashboard", href: "/admin", icon: BarChart3, show: isAuthenticated && user?.role === "admin" },
    { name: "Analytics", href: "/analytics", icon: BarChart3, show: isAuthenticated && user?.role === "admin" },
    { name: "Assignments", href: "/assignment-board", icon: ClipboardList, show: isAuthenticated && user?.role === "admin" }
  ];
  const visibleNav = navigation.filter(i => i.show);

  const handleLogout = () => { logout(); setMobileMenuOpen(false); navigate("/login"); };

  // ─── Mobile Drawer ────────────────────────────
  const MobileDrawer = () => (
    <>
      <div
        className={cn("fixed inset-0 z-40 bg-black/60 transition-opacity duration-300", mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={() => setMobileMenuOpen(false)}
      />
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 flex flex-col bg-[#1C1C1C] text-white shadow-2xl transition-transform duration-300 ease-out",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <Link to="/" className="font-bold text-lg uppercase tracking-wider" onClick={() => setMobileMenuOpen(false)}>
            CivicSync
          </Link>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {visibleNav.map(item => (
            <Link key={item.name} to={item.href}
              className={cn("flex items-center gap-3 px-4 py-3 text-sm font-medium uppercase tracking-wider transition-colors",
                location.pathname === item.href ? "bg-[#D52E25] text-white" : "text-white/70 hover:text-white hover:bg-white/10"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon className="w-4 h-4" />{item.name}
            </Link>
          ))}
        </nav>
        <div className="p-5 border-t border-white/10">
          {isAuthenticated && user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src={user.profilePhoto || "/default-profile.png"} alt="" className="w-10 h-10 object-cover border-2 border-[#D52E25]" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{user.username}</div>
                  <div className="text-xs text-white/50 truncate">{user.email}</div>
                </div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors w-full py-2">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link to="/login" className="btn-accent block text-center text-sm py-3" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
              <Link to="/report" className="btn-outline-dark block text-center text-sm py-3 border-white/30 text-white hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>Report Issue</Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );

  // ═══════════ HOME / LOGIN — editorial top navbar ═══════════
  if (isHomePage || isLoginPage) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className={cn(
          "w-full z-30 sticky top-0 border-b",
          isHomePage ? "bg-[#1C1C1C] text-white border-white/10" : "bg-white text-[#1C1C1C] border-gray-200"
        )}>
          <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="font-bold text-lg uppercase tracking-widest">CivicSync</Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              <nav className="flex items-center mr-6">
                {visibleNav.map(item => (
                  <Link key={item.name} to={item.href}
                    className={cn("px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
                      location.pathname === item.href
                        ? "text-[#D52E25]"
                        : isHomePage ? "text-white/60 hover:text-white" : "text-gray-500 hover:text-black"
                    )}
                  >{item.name}</Link>
                ))}
              </nav>
              {isAuthenticated && user ? (
                <div className="flex items-center gap-4">
                  <span className={cn("text-xs font-medium uppercase tracking-wider", isHomePage ? "text-white/60" : "text-gray-500")}>{user.username}</span>
                  <button onClick={handleLogout} className={cn("p-2 transition-colors", isHomePage ? "text-white/50 hover:text-white" : "text-gray-400 hover:text-black")}>
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/report" className="btn-accent text-xs py-2.5 px-6">Report Issue</Link>
                  <Link to="/login" className={cn("text-xs font-semibold uppercase tracking-widest py-2.5 px-4 transition-colors",
                    isHomePage ? "text-white/60 hover:text-white" : "text-gray-500 hover:text-black"
                  )}>Sign In</Link>
                </div>
              )}
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(true)}>
              <Menu className={cn("w-6 h-6", isHomePage ? "text-white" : "text-black")} />
            </button>
          </div>
        </header>

        <div className="md:hidden"><MobileDrawer /></div>

        <main className={cn("flex-1 w-full", isHomePage && "-mt-16")}>
          {children}
        </main>

        {/* --- Footer --- */}
        <footer className="bg-[#1C1C1C] text-white border-t border-white/10">
          <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-bold text-lg uppercase tracking-widest mb-4">CivicSync</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  Your civic grievance portal for transparent, accountable issue resolution across the city.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-widest text-white/60 mb-4">Quick Links</h4>
                <div className="space-y-2">
                  <Link to="/report" className="block text-sm text-white/40 hover:text-white transition-colors">Report Issue</Link>
                  <Link to="/map" className="block text-sm text-white/40 hover:text-white transition-colors">View Map</Link>
                  <Link to="/login" className="block text-sm text-white/40 hover:text-white transition-colors">Sign In</Link>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-xs uppercase tracking-widest text-white/60 mb-4">Legal</h4>
                <div className="space-y-2">
                  <a href="/terms" className="block text-sm text-white/40 hover:text-white transition-colors">Terms of Service</a>
                  <a href="/privacy" className="block text-sm text-white/40 hover:text-white transition-colors">Privacy Policy</a>
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs text-white/30 uppercase tracking-wider">
              &copy; {new Date().getFullYear()} CivicSync Cell. All Rights Reserved.
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ═══════════ ADMIN — top bar ═══════════
  if (isAuthenticated && user?.role === "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="container mx-auto px-6 h-14 flex items-center">
            <button className="md:hidden p-2 mr-3" onClick={() => setMobileMenuOpen(true)}><Menu className="w-5 h-5" /></button>
            <Link to="/" className="font-bold uppercase tracking-widest text-sm mr-8">CivicSync</Link>
            <nav className="hidden md:flex items-center flex-1">
              {[{ name: "Dashboard", href: "/admin" }, { name: "Assignments", href: "/assignment-board" }, { name: "Analytics", href: "/analytics" }].map(item => (
                <Link key={item.name} to={item.href}
                  className={cn("px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
                    location.pathname === item.href ? "text-[#D52E25]" : "text-gray-400 hover:text-black"
                  )}
                >{item.name}</Link>
              ))}
            </nav>
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-xs font-medium text-gray-500 hidden sm:block">{user?.username}</span>
              <img src={user?.profilePhoto || "/default-profile.png"} alt="" className="w-8 h-8 object-cover border border-gray-300" />
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-black transition-colors"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </header>
        <div className="md:hidden"><MobileDrawer /></div>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    );
  }

  // ═══════════ LOGGED-IN USER — sidebar ═══════════
  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="fixed z-40 top-0 left-0 h-screen w-60 hidden lg:flex flex-col bg-[#1C1C1C] text-white">
        <Link to="/" className="flex items-center px-6 py-6 border-b border-white/10">
          <span className="font-bold uppercase tracking-widest">CivicSync</span>
        </Link>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {visibleNav.map(item => (
            <Link key={item.name} to={item.href}
              className={cn("flex items-center gap-3 px-4 py-3 text-sm font-medium uppercase tracking-wider transition-colors",
                location.pathname.startsWith(item.href) ? "bg-[#D52E25]" : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <item.icon className="w-4 h-4" />{item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          {isAuthenticated && user && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <img src={user.profilePhoto || "/default-profile.png"} alt="" className="w-9 h-9 object-cover border-2 border-[#D52E25]" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{user.username}</div>
                  <div className="text-xs text-white/40 truncate">{user.email}</div>
                </div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors w-full py-2">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 z-30 p-3">
        <button className="p-2 bg-[#1C1C1C] text-white shadow-lg" onClick={() => setMobileMenuOpen(true)}>
          <Menu className="w-5 h-5" />
        </button>
      </div>
      <div className="lg:hidden"><MobileDrawer /></div>

      <main className="flex-1 min-h-screen p-4 md:p-8 pt-16 lg:pt-4 lg:ml-60">
        {children}
      </main>
    </div>
  );
}
