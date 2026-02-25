import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, FileText, Users, BarChart3, CheckCircle, Clock, ArrowRight, Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

const Index = () => {
  const navigate = useNavigate();

  // Fetch real reports from backend (public endpoint)
  const { data: reports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ["publicReports"],
    queryFn: async () => {
      const { data } = await api.get("/reports");
      return data.data;
    },
  });

  // Derive stats from real data
  const stats = {
    resolved: reports.filter((r: any) => r.status === "resolved").length,
    total: reports.length,
    pending: reports.filter((r: any) => r.status === "pending").length,
    inProgress: reports.filter((r: any) => r.status === "in-progress").length,
  };

  // Latest 4 reports for the "Recent Reports" section
  const recentReports = reports.slice(0, 4);

  return (
    <div className="w-full">
      {/* ═══════ HERO — full-bleed, large type ═══════ */}
      <section className="relative min-h-screen flex items-end bg-[#1C1C1C] text-white pt-16 overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1C] via-[#1C1C1C]/60 to-transparent" />

        <div className="container relative mx-auto px-6 pb-16 md:pb-24 z-10 animate-page-in">
          <div className="max-w-5xl">
            <p className="section-label mb-4 md:mb-6">Official Civic Grievance Portal</p>
            <h1 className="display-xl mb-6 md:mb-8">
              Report<br />
              <span className="text-[#D52E25]">Civic</span><br />
              Issues
            </h1>
            <p className="text-white/50 text-sm md:text-base max-w-md mb-8 leading-relaxed uppercase tracking-wider">
              File complaints about roads, streetlights, water, sanitation, and civic amenities. Direct to government departments.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('/login')} className="btn-accent flex items-center justify-center gap-3">
                <FileText className="w-4 h-4" /> Report an Issue
              </button>
              <button onClick={() => navigate('/login')} className="btn-outline-dark border-white/30 text-white hover:bg-white hover:text-black flex items-center justify-center gap-3">
                <MapPin className="w-4 h-4" /> View Map
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 right-6 z-10 hidden md:block">
          <div className="text-xs uppercase tracking-widest text-white/30 rotate-90 origin-bottom-right">Scroll</div>
        </div>
      </section>

      {/* ═══════ SEARCH BAR ═══════ */}
      <section className="bg-[#D52E25]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center bg-white">
              <span className="px-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Location</span>
              <input type="text" placeholder="Search issues — e.g. 'pothole MG Road'" className="flex-1 py-4 px-2 text-sm bg-transparent outline-none text-[#1C1C1C] placeholder:text-gray-400" />
              <span className="px-4 text-xs font-semibold uppercase tracking-widest text-gray-400 hidden sm:block">Category</span>
              <select className="py-4 px-2 text-sm bg-transparent outline-none text-[#1C1C1C] hidden sm:block">
                <option>All</option>
                <option>Roads</option>
                <option>Water</option>
                <option>Sanitation</option>
                <option>Streetlights</option>
              </select>
            </div>
            <button className="bg-[#1C1C1C] text-white p-4 hover:bg-black transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════ ABOUT SECTION — bold grid ═══════ */}
      <section className="bg-[#F3F2EE]">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[60vh]">
            {/* Left — text */}
            <div className="flex flex-col justify-center py-16 md:py-24 md:pr-16">
              <h2 className="display-lg mb-8">About</h2>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-6 uppercase tracking-wider max-w-md">
                We help citizens report, track, and resolve civic issues across the city's most critical infrastructure areas.
              </p>
              <div className="space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed uppercase tracking-wider">
                  Our approach combines direct communication with government departments, transparent tracking, and community participation.
                </p>
                <p className="text-xs text-gray-500 leading-relaxed uppercase tracking-wider">
                  We believe that efficient civic governance requires accountability, transparency, and active citizen engagement.
                </p>
              </div>
            </div>
            {/* Right — image */}
            <div className="relative min-h-[300px] md:min-h-0">
              <img
                src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1920"
                alt="City infrastructure"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ STATS — dynamic real numbers ═══════ */}
      <section className="bg-white border-t border-b border-gray-200">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { num: stats.resolved.toString(), label: "Issues Resolved" },
              { num: stats.total.toString(), label: "Total Reports" },
              { num: stats.pending.toString(), label: "Pending" },
              { num: stats.inProgress.toString(), label: "In Progress" },
            ].map((stat, i) => (
              <div key={stat.label} className={`py-10 md:py-16 ${i < 3 ? 'md:border-r border-gray-200' : ''} ${i < 2 ? 'border-r border-gray-200 md:border-r' : ''}`}>
                <div className="text-center">
                  <div className="stat-number">{isLoadingReports ? "—" : stat.num}</div>
                  <div className="text-xs uppercase tracking-widest text-gray-400 mt-3 font-semibold">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ SERVICES / FEATURES — editorial grid ═══════ */}
      <section className="bg-[#F3F2EE] py-16 md:py-24">
        <div className="container mx-auto px-6">
          <div className="mb-12">
            <p className="section-label mb-3">What We Offer</p>
            <h2 className="display-lg">Our Services</h2>
          </div>
          <p className="text-xs uppercase tracking-wider text-gray-500 max-w-2xl mb-12 leading-relaxed">
            Whether you're reporting a pothole, a broken streetlight, or a waste management issue — we ensure your complaint reaches the right department for the fastest resolution.
          </p>

          {/* 3-column image cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-gray-300">
            {[
              { title: "Report Issues", img: "https://images.unsplash.com/photo-1573599852326-2d4e1abee6ce?q=80&w=800", desc: "Submit civic complaints in under 30 seconds with automatic location detection." },
              { title: "Track Progress", img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800", desc: "Follow your issue from submission to resolution with real-time status updates." },
              { title: "Community Impact", img: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800", desc: "Upvote issues that matter. Higher engagement leads to faster government action." },
            ].map((item) => (
              <div key={item.title} className="border-r border-gray-300 last:border-r-0 bg-white">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <h3 className="font-bold uppercase tracking-wider text-sm mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-wider leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS + RECENT REPORTS (DYNAMIC) ═══════ */}
      <section className="bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 border-l border-r border-gray-200">
            {/* How it works */}
            <div className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-gray-200">
              <p className="section-label mb-3">Process</p>
              <h2 className="display-md mb-8">How It Works</h2>
              <div className="space-y-8">
                {[
                  { num: "01", title: "Describe the Issue", desc: "Select a category and enter the location." },
                  { num: "02", title: "Add Evidence", desc: "Upload a photo to document the problem." },
                  { num: "03", title: "Submit Report", desc: "Complaint routes to the relevant department." },
                  { num: "04", title: "Track Status", desc: "Follow real-time updates until resolution." },
                ].map(step => (
                  <div key={step.num} className="flex gap-6">
                    <span className="text-3xl font-extrabold text-[#D52E25] leading-none flex-shrink-0">{step.num}</span>
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-wider">{step.title}</h4>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Issues — DYNAMIC from backend */}
            <div className="p-8 md:p-12">
              <p className="section-label mb-3">Latest</p>
              <h2 className="display-md mb-8">Recent Reports</h2>
              <div className="space-y-0 border-t border-gray-200">
                {isLoadingReports ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#D52E25] mb-2" />
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Loading reports...</p>
                  </div>
                ) : recentReports.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-widest">No reports yet</p>
                  </div>
                ) : (
                  recentReports.map((issue: any) => {
                    const statusLabel = issue.status === 'in-progress' ? 'In Progress' : issue.status.charAt(0).toUpperCase() + issue.status.slice(1);
                    const statusClass = issue.status === 'pending' ? 'status-pending' : issue.status === 'in-progress' ? 'status-in-progress' : 'status-resolved';
                    return (
                      <div key={issue._id} className="flex items-center justify-between py-5 border-b border-gray-200 gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-xs uppercase tracking-wider truncate">
                            {issue.category}{issue.address ? `, ${issue.address}` : ''}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(issue.createdAt)}</div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 whitespace-nowrap ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <Link to="/map" className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-[#D52E25] mt-6 gap-2 hover:gap-3 transition-all">
                View All Issues <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="bg-[#1C1C1C] text-white overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[50vh]">
            <div className="relative min-h-[250px]">
              <img
                src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=1920"
                alt="City"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
            </div>
            <div className="flex flex-col justify-center py-16 md:py-24 md:pl-16">
              <h2 className="display-lg mb-6">
                <span className="text-[#D52E25]">Help</span><br />
                Your City
              </h2>
              <p className="text-white/40 text-xs uppercase tracking-wider max-w-sm mb-8 leading-relaxed">
                Your voice matters. Use the official platform for transparent and fast civic issue resolution. Together we can make our city better.
              </p>
              <div>
                <button onClick={() => navigate('/login')} className="btn-accent flex items-center gap-3">
                  File a Grievance <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;