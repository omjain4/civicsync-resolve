import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, FileText, Users, BarChart3, CheckCircle, Clock } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Easy Reporting",
    description: "Report civic issues securely. Your submission goes directly to officials for quick action."
  },
  {
    icon: MapPin,
    title: "Public Issue Map",
    description: "Stay informed. All cases are visible citywide, encouraging public participation."
  },
  {
    icon: BarChart3,
    title: "Transparent Analytics",
    description: "Track resolution speed and departmental performance with live, open data."
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Work together with citizens and government for a better, cleaner city."
  }
];
const stats = [
  { label: "Cases Closed", value: "1,247", icon: CheckCircle },
  { label: "Verified Users", value: "3,891", icon: Users },
  { label: "Avg Response", value: "2.3 days", icon: Clock },
  { label: "Departments", value: "12", icon: BarChart3 }
];

const Index = () => {
  const navigate = useNavigate();

  const handleReportClick = () => {
    navigate('/login');
  };

  const handleLocationClick = () => {
    navigate('/login');
  };

  return (
    <div className="w-full gradient-mesh min-h-screen">
      {/* --- HERO SECTION UPDATED --- */}
      <section 
        className="relative flex items-center justify-center text-white min-h-[600px] md:min-h-[680px] lg:min-h-[800px] pt-20 animate-fade-in"
        style={{
          backgroundImage: `url('https://img.freepik.com/premium-photo/responsible-group-children-cleaning-park_53876-22129.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/60 to-blue-900/80 backdrop-blur-sm"></div>
        <div className="container relative mx-auto px-4 z-10 text-center animate-slide-up">
          <div className="max-w-2xl mx-auto mb-6 md:mb-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent animate-scale-in">
              Report, view, and resolve local civic problems
            </h2>
            <p className="text-base md:text-lg text-blue-100 font-medium animate-fade-in">
              For complaints about roads, streetlights, water, sanitation, and civic amenities
            </p>
          </div>
          <div className="max-w-xl mx-auto flex flex-col items-center gap-2 animate-scale-in">
            <input 
              type="text" 
              placeholder="Enter locality, problem, or area (e.g. 'water leak MG road')"
              className="glass-input w-full px-5 py-3 text-base md:text-lg text-gray-900 font-medium transition-all duration-300 focus:scale-105"
            />
            <div className="flex w-full flex-col gap-2 mt-2 sm:flex-row sm:justify-between">
              <Button 
                onClick={handleReportClick}
                size="lg"
                className="glass-button w-full sm:w-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:scale-105 transition-all duration-300"
              >
                Report now
              </Button>
              <Button 
                onClick={handleLocationClick}
                size="lg"
                className="glass-button w-full sm:w-1/2 border-white text-white hover:bg-white/10 transition-all duration-300"
              >
                📍 Use my current location
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* --- CONTENT SECTION WRAPPER --- */}
      <div className="relative glass -mt-20 rounded-t-[40px] pt-20 animate-slide-up">
        {/* Stats Cards */}
        <section className="py-6 md:py-8 animate-fade-in">
          <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {stats.map((stat, index) => (
              <div key={stat.label} className="glass-card flex flex-col py-5 gap-2 animate-scale-in hover:scale-105 transition-all duration-300" style={{animationDelay: `${index * 100}ms`}}>
                <stat.icon className="w-7 h-7 mx-auto text-blue-700 animate-float" />
                <div className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-900 to-purple-700 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-xs uppercase tracking-wide text-blue-600">{stat.label}</div>
              </div>  
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-8 md:py-14 animate-fade-in">
          <div className="container mx-auto px-2 md:px-4">
            <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-900 to-purple-700 bg-clip-text text-transparent mb-5 md:mb-8 text-center tracking-tight animate-slide-up">
              Why use the official portal?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {features.map(({ icon: Icon, title, description }, index) => (
                <Card key={title} className="glass-card hover:-translate-y-2 transition-all duration-500 animate-scale-in" style={{animationDelay: `${index * 150}ms`}}>
                  <CardHeader className="flex flex-col items-center mt-6 mb-2">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-700 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-2xl animate-float">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-lg font-semibold bg-gradient-to-r from-blue-900 to-purple-700 bg-clip-text text-transparent">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base text-blue-800 leading-relaxed text-center mt-2 mb-4">
                      {description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How to Report & Recent Reports */}
        <section className="py-10 md:py-14 glass border-t border-white/20 animate-fade-in">
          <div className="container mx-auto px-2 md:px-4 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
            <div className="animate-slide-up">
              <h4 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-900 to-purple-700 bg-clip-text text-transparent mb-6">How to file a complaint</h4>
              <ol className="space-y-6 pl-5 border-l-4 border-gradient-to-b from-blue-700 to-purple-600">
                <li className="relative pl-8 animate-fade-in" style={{animationDelay: '100ms'}}><span className="absolute left-[-20px] top-0 font-bold bg-gradient-to-br from-blue-700 to-purple-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg">1</span><span className="font-medium text-blue-900">Describe the civic issue &amp; choose location</span></li>
                <li className="relative pl-8 animate-fade-in" style={{animationDelay: '200ms'}}><span className="absolute left-[-20px] top-0 font-bold bg-gradient-to-br from-blue-700 to-purple-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg">2</span><span className="font-medium text-blue-900">Add a photo or details if possible</span></li>
                <li className="relative pl-8 animate-fade-in" style={{animationDelay: '300ms'}}><span className="absolute left-[-20px] top-0 font-bold bg-gradient-to-br from-blue-700 to-purple-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg">3</span><span className="font-medium text-blue-900">Submit - the issue goes directly to government officers</span></li>
                <li className="relative pl-8 animate-fade-in" style={{animationDelay: '400ms'}}><span className="absolute left-[-20px] top-0 font-bold bg-gradient-to-br from-blue-700 to-purple-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg">4</span><span className="font-medium text-blue-900">Track status &amp; updates on portal</span></li>
              </ol>
            </div>
            <div className="animate-slide-up">
              <h4 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-900 to-purple-700 bg-clip-text text-transparent mb-6">Recently Reported Problems</h4>
              <ul className="space-y-6">
                <li className="glass-card p-5 border-l-4 border-gradient-to-b from-blue-700 to-purple-600 hover:scale-105 transition-all duration-300 animate-fade-in" style={{animationDelay: '100ms'}}><div className="font-semibold text-blue-800">Broken Streetlight, Nehru Road</div><div className="text-xs text-blue-600 mt-1">Today, 8:20 AM &middot; Status: Reported</div></li>
                <li className="glass-card p-5 border-l-4 border-gradient-to-b from-blue-700 to-purple-600 hover:scale-105 transition-all duration-300 animate-fade-in" style={{animationDelay: '200ms'}}><div className="font-semibold text-blue-800">Overflowing Dustbin, Railway Colony</div><div className="text-xs text-blue-600 mt-1">Yesterday, 3:10 PM &middot; Status: Pending</div></li>
                <li className="glass-card p-5 border-l-4 border-gradient-to-b from-blue-700 to-purple-600 hover:scale-105 transition-all duration-300 animate-fade-in" style={{animationDelay: '300ms'}}><div className="font-semibold text-blue-800">Water leakage, Sector 21</div><div className="text-xs text-blue-600 mt-1">Yesterday, 10:43 AM &middot; Status: In Progress</div></li>
              </ul>
            </div>
          </div>
        </section>

        {/* Final Call to Action */}
        <section className="py-10 md:py-16 bg-gradient-to-br from-blue-700 via-purple-800 to-blue-900 animate-fade-in">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-2xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent animate-scale-in">Ready to help your city?</h3>
            <p className="text-base md:text-xl text-blue-100 max-w-2xl mx-auto mb-8 animate-fade-in">
              Use the government's official platform for transparent and fast civic issue resolution!
            </p>
            <Button onClick={handleReportClick} size="lg" className="glass-button bg-white text-blue-900 font-bold text-lg px-8 py-4 md:px-12 md:py-6 hover:scale-110 transition-all duration-300 shadow-2xl animate-scale-in">
              File a New Grievance Now
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;