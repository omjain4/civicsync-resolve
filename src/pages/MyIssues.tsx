import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, CheckCircle, AlertTriangle, ThumbsUp, ArrowRight, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

const fetchMyIssues = async () => {
  const { data } = await api.get("/reports/my-reports");
  return data.data;
};

const statusConfig: Record<string, { class: string; icon: any }> = {
  'pending': { class: 'status-pending', icon: Clock },
  'in-progress': { class: 'status-in-progress', icon: AlertTriangle },
  'resolved': { class: 'status-resolved', icon: CheckCircle },
};

export default function MyIssues() {
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  const { data: issues, isLoading } = useQuery({ queryKey: ["myIssues"], queryFn: fetchMyIssues });

  const tabs = ["all", "pending", "in-progress", "resolved"];

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    if (activeTab === "all") return issues;
    return issues.filter((i: any) => i.status === activeTab);
  }, [issues, activeTab]);

  const counts = useMemo(() => ({
    all: issues?.length ?? 0,
    pending: issues?.filter((i: any) => i.status === 'pending')?.length ?? 0,
    'in-progress': issues?.filter((i: any) => i.status === 'in-progress')?.length ?? 0,
    resolved: issues?.filter((i: any) => i.status === 'resolved')?.length ?? 0,
  }), [issues]);

  return (
    <div className="min-h-screen bg-background animate-page-in">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <p className="section-label mb-2">My Dashboard</p>
          <h1 className="display-md mb-2">My Issues</h1>
          <p className="text-xs uppercase tracking-wider text-gray-400">Track your reported civic complaints</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-0 border border-gray-200 bg-white mb-8">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-4 text-center transition-colors border-r border-gray-200 last:border-r-0 ${activeTab === tab ? 'bg-[#1C1C1C] text-white' : 'hover:bg-gray-50'
                }`}
            >
              <div className={`text-2xl font-extrabold ${activeTab === tab ? 'text-[#D52E25]' : 'text-gray-900'}`}>
                {counts[tab as keyof typeof counts]}
              </div>
              <div className={`text-[10px] uppercase tracking-widest font-semibold mt-1 ${activeTab === tab ? 'text-white/70' : 'text-gray-400'}`}>
                {tab === 'in-progress' ? 'Active' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
            </button>
          ))}
        </div>

        {/* Issue list */}
        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-6 h-6 border-2 border-[#D52E25] border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-400 uppercase tracking-widest">Loading issues...</p>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-gray-400 uppercase tracking-wider">No issues found</p>
            </div>
          ) : (
            filteredIssues.map((issue: any) => {
              const config = statusConfig[issue.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div key={issue._id} onClick={() => navigate(`/issues/${issue._id}`)} className="flex items-center gap-4 py-5 border-b border-gray-200 bg-white px-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                  {issue.imageUrl ? (
                    <img src={issue.imageUrl} alt="" className="w-14 h-14 object-cover flex-shrink-0 border border-gray-200" />
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                      <MapPin className="w-5 h-5 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xs uppercase tracking-wider truncate">{issue.category}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" /> {issue.address}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${config.class}`}>
                        {issue.status.replace('-', ' ')}
                      </span>
                      {issue.upvotes > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> {issue.upvotes}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#D52E25] transition-colors flex-shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}