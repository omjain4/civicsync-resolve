import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import ReportIssue from "./pages/ReportIssue";
import MapView from "./pages/MapView";
import MyIssues from "./pages/MyIssues";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import AssignmentBoard from "./pages/AssignmentBoard";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle authenticated user redirects from login page
const LoginRedirect = () => {
  return <Navigate to="/profile" replace />;
};

const AdminLoginRedirect = () => {
  return <Navigate to="/admin" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Login Route - Always accessible but redirects if authenticated */}
            <Route path="/login" element={<Login />} />
            
            {/* Public Routes with Layout */}
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/map" element={<Layout><MapView /></Layout>} />
            
            {/* Protected Routes for all logged-in users */}
            <Route element={<ProtectedRoute />}>
              <Route path="/report" element={<Layout><ReportIssue /></Layout>} />
              <Route path="/my-issues" element={<Layout><MyIssues /></Layout>} />
              <Route path="/profile" element={<Layout><Profile /></Layout>} />
            </Route>
            
            {/* Protected Routes for Admins only */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
              <Route path="/assignment-board" element={<Layout><AssignmentBoard /></Layout>} />
              <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
            </Route>
            
            {/* Catch-all Not Found Route */}
            <Route path="*" element={<Layout><NotFound /></Layout>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
