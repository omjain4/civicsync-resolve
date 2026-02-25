import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { MapPin, Clock, CheckCircle, AlertTriangle, ThumbsUp, Loader2, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

const fetchReports = async () => {
    const { data } = await api.get("/reports");
    return data.data;
};

const createMarkerIcon = (status: string) => {
    const colors: Record<string, string> = { 'pending': '#f59e0b', 'in-progress': '#3b82f6', 'resolved': '#10b981' };
    return L.divIcon({
        className: '',
        iconSize: [28, 28],
        html: `<div style="width:28px;height:28px;background:${colors[status] || '#D52E25'};display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    });
};

const statusConfig: Record<string, { class: string; icon: any }> = {
    'pending': { class: 'status-pending', icon: Clock },
    'in-progress': { class: 'status-in-progress', icon: AlertTriangle },
    'resolved': { class: 'status-resolved', icon: CheckCircle },
};

export default function MapView() {
    const [filter, setFilter] = useState("all");
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const { data: reports, isLoading } = useQuery({ queryKey: ["reports"], queryFn: fetchReports });
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const upvoteMutation = useMutation({
        mutationFn: (id: string) => api.post(`/reports/${id}/upvote`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reports"] }); toast({ title: "Upvoted!" }); },
        onError: (error: any) => toast({ title: "Could not upvote", description: error.response?.data?.message, variant: "destructive" }),
    });

    const filteredReports = useMemo(() => {
        if (!reports) return [];
        if (filter === "all") return reports;
        return reports.filter((r: any) => r.status === filter);
    }, [reports, filter]);

    return (
        <div className="min-h-screen bg-background animate-page-in">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
                    <div>
                        <p className="section-label mb-2">Civic Map</p>
                        <h1 className="display-md">Issue Map</h1>
                    </div>
                    <div className="flex gap-0 border border-gray-300 bg-white">
                        {["all", "pending", "in-progress", "resolved"].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-4 py-2.5 text-[10px] uppercase tracking-widest font-semibold transition-colors border-r border-gray-300 last:border-r-0 ${filter === f ? 'bg-[#1C1C1C] text-white' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                            >{f === 'in-progress' ? 'Active' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                        ))}
                    </div>
                </div>

                {/* Map + List grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-gray-200">
                    {/* Map */}
                    <div className="lg:col-span-2 h-[400px] lg:h-[600px] border-b lg:border-b-0 lg:border-r border-gray-200">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center bg-gray-100">
                                <div className="text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D52E25] mb-2" />
                                    <p className="text-xs uppercase tracking-widest text-gray-400">Loading map...</p>
                                </div>
                            </div>
                        ) : (
                            <MapContainer center={[20.5937, 78.9629]} zoom={5} className="h-full w-full z-10">
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                                {filteredReports
                                    .filter((r: any) => r.location?.coordinates)
                                    .map((report: any) => (
                                        <Marker key={report._id}
                                            position={[report.location.coordinates[1], report.location.coordinates[0]]}
                                            icon={createMarkerIcon(report.status)}
                                            eventHandlers={{ click: () => setSelectedIssue(report) }}
                                        >
                                            <Popup>
                                                <div className="p-1">
                                                    <h3 className="font-bold text-xs uppercase">{report.category}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">{report.address}</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))
                                }
                            </MapContainer>
                        )}
                    </div>

                    {/* Issue list panel */}
                    <div className="bg-white overflow-y-auto max-h-[400px] lg:max-h-[600px]">
                        <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                            <h2 className="text-xs font-bold uppercase tracking-widest">
                                Issues <span className="text-gray-400 ml-1">({filteredReports.length})</span>
                            </h2>
                        </div>
                        {filteredReports.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-xs text-gray-400 uppercase tracking-widest">No issues found</p>
                            </div>
                        ) : (
                            filteredReports.map((report: any) => {
                                const config = statusConfig[report.status] || statusConfig.pending;
                                return (
                                    <div key={report._id}
                                        className={`p-4 border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 ${selectedIssue?._id === report._id ? 'bg-gray-50 border-l-4 border-l-[#D52E25]' : ''}`}
                                        onClick={() => setSelectedIssue(report)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {report.imageUrl ? (
                                                <img src={report.imageUrl} alt="" className="w-12 h-12 object-cover flex-shrink-0 border" />
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-100 flex items-center justify-center flex-shrink-0 border">
                                                    <MapPin className="w-4 h-4 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-[11px] uppercase tracking-wider truncate">{report.category}</h3>
                                                <p className="text-[10px] text-gray-400 truncate mt-0.5">{report.address}</p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 ${config.class}`}>
                                                        {report.status.replace('-', ' ')}
                                                    </span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); upvoteMutation.mutate(report._id); }}
                                                        className="text-[10px] text-gray-400 hover:text-[#D52E25] flex items-center gap-1 transition-colors"
                                                    >
                                                        <ThumbsUp className="w-3 h-3" /> {report.upvotes || 0}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}