import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, MapPin, Clock, Users, AlertCircle, Calendar, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";

interface Report {
  _id: string;
  category: string;
  status: string;
  createdAt: string;
  severity?: number;
  location?: {
    coordinates: [number, number];
  };
}

const fetchAllReports = async (): Promise<Report[]> => {
  const { data } = await api.get('/reports');
  return data.data;
};

const fetchReportStats = async () => {
  const { data } = await api.get('/reports/stats');
  return data.data;
};

const COLORS = ["#2563eb", "#7c3aed", "#16a34a", "#eab308", "#db2777", "#f97316"];

export default function Analytics() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['analyticsReports'],
    queryFn: fetchAllReports
  });

  // Compute stats
  const analytics = useMemo(() => {
    if (!reports) return null;

    // Categories
    const categoryStats = reports.reduce((acc, rep) => {
      acc[rep.category] = (acc[rep.category] || 0) + 1; return acc;
    }, {} as Record<string, number>);
    const categoryData = Object.entries(categoryStats)
      .map(([name, count]) => ({
        name, value: count,
        percentage: Math.round((count / reports.length) * 100)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Trends by month
    const monthlyStats = reports.reduce((acc, rep) => {
      const month = new Date(rep.createdAt).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + 1; return acc;
    }, {} as Record<string, number>);
    const monthlyData = Object.entries(monthlyStats)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    // By week (last 7 days)
    const now = new Date();
    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const count = reports.filter(rep =>
        new Date(rep.createdAt).toDateString() === date.toDateString()
      ).length;
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count,
      };
    }).reverse();

    // Statuses
    const statusStats = reports.reduce((acc, rep) => {
      acc[rep.status] = (acc[rep.status] || 0) + 1; return acc;
    }, {} as Record<string, number>);

    // Severity
    const severityStats = reports
      .filter(r => typeof r.severity === "number")
      .reduce((acc, rep) => {
        const level = rep.severity!;
        acc[level] = (acc[level] || 0) + 1; return acc;
      }, {} as Record<number, number>);
    const severityData = Object.entries(severityStats).map(([level, count]) => ({
      level, value: count
    }));

    // Hotspots
    const locationClusters = reports
      .filter(rep => rep.location?.coordinates)
      .reduce((acc, rep) => {
        const coords = rep.location!.coordinates;
        const key = `${coords[1].toFixed(2)},${coords[0].toFixed(2)}`;
        if (!acc[key]) acc[key] = { count: 0, lat: coords[1], lng: coords[0] };
        acc[key].count++;
        return acc;
      }, {} as Record<string, { count: number; lat: number; lng: number }>);
    const hotspots = Object.values(locationClusters)
      .sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      categoryData,
      monthlyData,
      statusStats,
      severityData,
      weeklyData,
      hotspots,
      totalReports: reports.length,
      averagePerDay: Math.round(reports.length / 30) || 1,
      resolutionRate: Math.round((statusStats.resolved / reports.length) * 100) || 0
    };
  }, [reports]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }
  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
          <p className="text-muted-foreground">Start by submitting some reports to see analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eaf4fb] via-[#f8fafc] to-[#eaf4fb]">
      <div className="container mx-auto px-4 py-12">
        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-blue-900 mb-3">Analytics Dashboard</h1>
          <p className="text-lg text-blue-800 font-medium">Civic issue reporting & resolution patterns</p>
        </div>

        {/* SUMMARIES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-7 mb-10">
          <SummaryTile value={analytics.totalReports} label="Total Reports" icon={<FileText className="w-7 h-7 text-blue-700" />} color="text-blue-700" />
          <SummaryTile value={analytics.resolutionRate + "%"} label="Resolution Rate" icon={<TrendingUp className="w-7 h-7 text-green-700" />} color="text-green-700" />
          <SummaryTile value={analytics.averagePerDay} label="Daily Average" icon={<Clock className="w-7 h-7 text-orange-700" />} color="text-orange-700" />
          <SummaryTile value={analytics.hotspots.length} label="Hotspot Areas" icon={<MapPin className="w-7 h-7 text-purple-700" />} color="text-purple-700" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CATEGORY PIE */}
          <Card className="shadow-civic-strong border border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5"/> Top Categories</CardTitle>
              <CardDescription>Distribution of top 5 civic complaint categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#2563eb" label>
                    {analytics.categoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* STATUS PIE */}
          <Card className="shadow-civic-strong border border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Status Overview</CardTitle>
              <CardDescription>Pending, In Progress & Resolved proportions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Pending", value: analytics.statusStats.pending || 0 },
                      { name: "In Progress", value: analytics.statusStats["in-progress"] || 0 },
                      { name: "Resolved", value: analytics.statusStats.resolved || 0 },
                    ]}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#4f46e5"
                    label
                  >
                    <Cell fill="#eab308" />
                    <Cell fill="#2563eb" />
                    <Cell fill="#16a34a" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* WEEKLY BAR */}
          <Card className="shadow-civic-strong border border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5"/> Past 7 Days</CardTitle>
              <CardDescription>Number of reports submitted each day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#2563eb" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* MONTHLY LINE */}
          <Card className="shadow-civic-strong border border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Monthly Trend</CardTitle>
              <CardDescription>Civic complaints trend over last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={analytics.monthlyData}>
                  <XAxis dataKey="month" stroke="#2563eb" />
                  <YAxis allowDecimals={false}/>
                  <Tooltip />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={3} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          {/* SEVERITY BAR */}
          <Card className="shadow-civic-strong border border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Severity Levels</CardTitle>
              <CardDescription>Distribution of severity for all reports</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analytics.severityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="level" stroke="#db2777"/>
                  <YAxis allowDecimals={false}/>
                  <Tooltip />
                  <Bar dataKey="value" fill="#db2777" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* HOTSPOT LIST */}
          <Card className="shadow-civic-strong border border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" /> Hotspot Areas</CardTitle>
              <CardDescription>Zones with highest repeat reports</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.hotspots.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {analytics.hotspots.map((hotspot, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-800">{idx + 1}</div>
                        <div>
                          <span className="font-medium text-blue-900">{hotspot.lat.toFixed(4)}, {hotspot.lng.toFixed(4)}</span>
                          <span className="block text-xs text-muted-foreground">({hotspot.count} reports)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-blue-800">No repeat-report clusters found.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Summary tile helper component
function SummaryTile({ value, label, icon, color }: { value: React.ReactNode, label: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white rounded shadow flex flex-col items-center py-8 gap-2 border border-blue-100">
      <div className={color}>{icon}</div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-blue-800 uppercase tracking-wider">{label}</span>
    </div>
  );
}
