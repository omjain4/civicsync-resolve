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
    <div className="w-full bg-white">
      {/* --- HERO SECTION UPDATED --- */}
      <section 
  className="relative flex items-center justify-center text-white min-h-[600px] md:min-h-[680px] lg:min-h-[800px] pt-20"
  style={{
    backgroundImage: `url('https://img.freepik.com/premium-photo/responsible-group-children-cleaning-park_53876-22129.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center bottom'
  }}
>
        <div className="absolute inset-0 bg-blue-900/70"></div>
        <div className="container relative mx-auto px-4 z-10 text-center">
          <div className="max-w-2xl mx-auto mb-6 md:mb-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-white">
              Report, view, and resolve local civic problems
            </h2>
            <p className="text-base md:text-lg text-blue-100 font-medium">
              For complaints about roads, streetlights, water, sanitation, and civic amenities
            </p>
          </div>
          <div className="max-w-xl mx-auto flex flex-col items-center gap-2">
            <input 
              type="text" 
              placeholder="Enter locality, problem, or area (e.g. 'water leak MG road')"
              className="rounded-none w-full px-5 py-3 border border-blue-200 shadow bg-white text-base md:text-lg text-gray-900 outline-none font-medium"
            />
            <div className="flex w-full flex-col gap-2 mt-2 sm:flex-row sm:justify-between">
              <Button 
                onClick={handleReportClick}
                size="lg"
                className="rounded-none w-full sm:w-1/2 bg-white text-blue-900 font-semibold hover:bg-blue-100"
              >
                Report now
              </Button>
              <Button 
                onClick={handleLocationClick}
                size="lg"
                variant="outline" 
                className="rounded-none w-full sm:w-1/2 border-white  text-blue-900"
              >
                📍 Use my current location
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* --- CONTENT SECTION WRAPPER --- */}
      <div className="relative bg-gradient-to-b from-[#eaf4fb] via-[#f8fafc] to-[#f8fafc] -mt-20 rounded-t-[40px] pt-20">
        {/* Stats Cards */}
        <section className="py-6 md:py-8">
          <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col py-5 gap-2 border bg-white rounded-lg shadow-sm">
                <stat.icon className="w-7 h-7 mx-auto text-blue-700" />
                <div className="text-lg md:text-2xl font-bold text-blue-900">{stat.value}</div>
                <div className="text-xs uppercase tracking-wide text-blue-600">{stat.label}</div>
              </div>  
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-8 md:py-14">
          <div className="container mx-auto px-2 md:px-4">
            <h3 className="text-2xl md:text-3xl font-bold text-blue-900 mb-5 md:mb-8 text-center tracking-tight">
              Why use the official portal?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {features.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="shadow-civic hover:shadow-civic-strong border-blue-100 transition-all duration-200">
                  <CardHeader className="flex flex-col items-center mt-6 mb-2">
                    <div className="w-14 h-14 bg-blue-700 rounded-lg flex items-center justify-center mb-4 shadow-lg">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-blue-900">{title}</CardTitle>
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
        <section className="py-10 md:py-14 bg-white border-t border-blue-100">
          <div className="container mx-auto px-2 md:px-4 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
            <div>
              <h4 className="text-xl md:text-2xl font-bold text-blue-900 mb-6">How to file a complaint</h4>
              <ol className="space-y-6 pl-5 border-l-4 border-blue-700">
                <li className="relative pl-8"><span className="absolute left-[-20px] top-0 font-bold bg-blue-700 text-white w-7 h-7 rounded-full flex items-center justify-center">1</span><span className="font-medium text-blue-900">Describe the civic issue &amp; choose location</span></li>
                <li className="relative pl-8"><span className="absolute left-[-20px] top-0 font-bold bg-blue-700 text-white w-7 h-7 rounded-full flex items-center justify-center">2</span><span className="font-medium text-blue-900">Add a photo or details if possible</span></li>
                <li className="relative pl-8"><span className="absolute left-[-20px] top-0 font-bold bg-blue-700 text-white w-7 h-7 rounded-full flex items-center justify-center">3</span><span className="font-medium text-blue-900">Submit - the issue goes directly to government officers</span></li>
                <li className="relative pl-8"><span className="absolute left-[-20px] top-0 font-bold bg-blue-700 text-white w-7 h-7 rounded-full flex items-center justify-center">4</span><span className="font-medium text-blue-900">Track status &amp; updates on portal</span></li>
              </ol>
            </div>
            <div>
              <h4 className="text-xl md:text-2xl font-bold text-blue-900 mb-6">Recently Reported Problems</h4>
              <ul className="space-y-6">
                <li className="p-5 border-l-4 border-blue-700 bg-blue-50 rounded"><div className="font-semibold text-blue-800">Broken Streetlight, Nehru Road</div><div className="text-xs text-blue-600 mt-1">Today, 8:20 AM &middot; Status: Reported</div></li>
                <li className="p-5 border-l-4 border-blue-700 bg-blue-50 rounded"><div className="font-semibold text-blue-800">Overflowing Dustbin, Railway Colony</div><div className="text-xs text-blue-600 mt-1">Yesterday, 3:10 PM &middot; Status: Pending</div></li>
                <li className="p-5 border-l-4 border-blue-700 bg-blue-50 rounded"><div className="font-semibold text-blue-800">Water leakage, Sector 21</div><div className="text-xs text-blue-600 mt-1">Yesterday, 10:43 AM &middot; Status: In Progress</div></li>
              </ul>
            </div>
          </div>
        </section>

        {/* Final Call to Action */}
        <section className="py-10 md:py-16 bg-gradient-to-b from-blue-700 via-blue-800 to-blue-900">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-2xl md:text-4xl font-bold mb-4 text-white">Ready to help your city?</h3>
            <p className="text-base md:text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Use the government's official platform for transparent and fast civic issue resolution!
            </p>
            <Button onClick={handleReportClick} size="lg" className="bg-white text-blue-900 font-bold text-lg px-8 py-4 md:px-12 md:py-6 rounded-none hover:bg-blue-100">
              File a New Grievance Now
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;