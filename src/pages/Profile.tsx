import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Phone, Calendar, LogOut, Edit, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Helper component for list items
const ProfileDetailRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) => (
  <li className="flex items-center justify-between py-4 border-b">
    <div className="flex items-center gap-4">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-muted-foreground">{label}</span>
    </div>
    <span className="font-semibold">{value || 'N/A'}</span>
  </li>
);

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <div>Loading profile...</div>;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const joinDate = 'Not available';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-t-4 border-primary">
            <CardHeader className="text-center items-center gap-2 pt-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center mb-4 overflow-hidden border-4 border-white shadow">
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>
              <CardTitle className="text-3xl">{user.role === 'admin' ? 'Administrator' : 'Citizen Profile'}</CardTitle>
              <p className="text-lg text-muted-foreground">{user.email}</p>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize mt-2">
                {user.role}
              </Badge>
            </CardHeader>
            <CardContent className="px-8 py-6">
              <ul className="space-y-2">
                <ProfileDetailRow icon={<Mail className="w-5 h-5" />} label="Email Address" value={user.email} />
                <ProfileDetailRow icon={<Phone className="w-5 h-5" />} label="Phone Number" value={user.phone} />
                <ProfileDetailRow icon={<Calendar className="w-5 h-5" />} label="Member Since" value={joinDate} />
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 p-6 bg-slate-50 border-t">
              <div className="flex gap-2">
                <Button variant="outline" disabled>
                  <Edit className="w-4 h-4 mr-2"/>
                  Edit Profile
                </Button>
                 <Button variant="outline" disabled>
                  <KeyRound className="w-4 h-4 mr-2"/>
                  Change Password
                </Button>
              </div>
              <Button onClick={handleLogout} variant="destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
