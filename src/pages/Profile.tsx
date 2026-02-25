import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Phone, Calendar, LogOut, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProfileDetailRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) => (
  <div className="flex items-center gap-4 py-4 border-b border-gray-200 last:border-b-0">
    <div className="text-gray-400 flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">{label}</p>
      <p className="font-semibold text-sm text-gray-900 truncate">{value || "Not available"}</p>
    </div>
  </div>
);

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background animate-page-in">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <p className="section-label mb-2">Account</p>
        <h1 className="display-md mb-8">My Profile</h1>

        <div className="ed-card bg-white">
          <div className="text-center py-10 border-b border-gray-200">
            <div className="w-24 h-24 overflow-hidden border-4 border-[#D52E25] mx-auto mb-4">
              <img
                src={user.profilePhoto || "/default-profile.png"}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="font-bold text-lg uppercase tracking-wider">{user.username}</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-[#1C1C1C] text-white px-4 py-1.5 inline-block mt-2">
              {user.role || 'citizen'}
            </span>
          </div>
          <div className="px-6 pb-6">
            <div>
              <ProfileDetailRow icon={<User className="w-4 h-4" />} label="Username" value={user.username} />
              <ProfileDetailRow icon={<Mail className="w-4 h-4" />} label="Email Address" value={user.email} />
              <ProfileDetailRow icon={<Phone className="w-4 h-4" />} label="Phone Number" value={user.phone} />
              <ProfileDetailRow icon={<Calendar className="w-4 h-4" />} label="Member Since" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : undefined} />
              <ProfileDetailRow icon={<KeyRound className="w-4 h-4" />} label="Account Type" value={user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'Citizen'} />
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button onClick={handleLogout} className="btn-accent w-full flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
