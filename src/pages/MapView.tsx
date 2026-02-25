import { useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Clock, CheckCircle, AlertTriangle, ThumbsUp, Loader2, X, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

const fetchReports = async () => {
    const { data } = await api.get("/reports");
    return data.data;
};

const createMarkerIcon = (status: string, isSelected: boolean = false) => {
    const colors: Record<string, string> = { 'pending': '#f59e0b', 'in-progress': '#3b82f6', 'resolved': '#10b981' };
    const bg = colors[status] || '#D52E25';
    const size = isSelected ? 36 : 28;
    const border = isSelected ? '4px solid #D52E25' : '3px solid white';
    return L.divIcon({
        className: '',
        iconSize: [size, size],
        html: `<div style="width:${size}px;height:${size}px;background:${bg};display:flex;align-items:center;justify-content:center;border:${border};box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:all 0.2s"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    });
};

const statusConfig: Record<string, { class: string; icon: any; label: string }> = {
    'pending': { class: 'status-pending', icon: Clock, label: 'Pending' },
    'in-progress': { class: 'status-in-progress', icon: AlertTriangle, label: 'In Progress' },
    'resolved': { class: 'status-resolved', icon: CheckCircle, label: 'Resolved' },
};

// Component to fly to a location on the map
function FlyToMarker({ position }: { position: [number, number] | null }) {
    const map = useMap();
    if (position) {
        map.flyTo(position, 14, { duration: 1 });
    }
    return null;
}

const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

export default function MapView() {
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
    const { data: reports, isLoading } = useQuery({ queryKey: ["reports"], queryFn: fetchReports });
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Upvote with optimistic update for instant feedback
    const upvoteMutation = useMutation({
        mutationFn: (id: string) => api.put(`/reports/${id}/upvote`),
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({ queryKey: ["reports"] });
            const previous = queryClient.getQueryData(["reports"]);
            queryClient.setQueryData(["reports"], (old: any) =>
                old?.map((r: any) => r._id === id ? { ...r, upvotes: [...(r.upvotes || []), "optimistic"] } : r)
            );
            return { previous };
        },
        onError: (error: any, _id, context) => {
            queryClient.setQueryData(["reports"], context?.previous);
            toast({ title: "Could not upvote", description: error.response?.data?.message || "You may need to log in first.", variant: "destructive" });
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
    });

    // Get unique categories for filter
    const categories = useMemo(() => {
        if (!reports) return [];
        const cats = [...new Set(reports.map((r: any) => r.category))].sort();
        return cats as string[];
    }, [reports]);

    // Apply all filters
    const filteredReports = useMemo(() => {
        if (!reports) return [];
        let filtered = reports;
        if (statusFilter !== "all") {
            filtered = filtered.filter((r: any) => r.status === statusFilter);
        }
        if (categoryFilter !== "all") {
            filtered = filtered.filter((r: any) => r.category === categoryFilter);
        }
        return filtered;
    }, [reports, statusFilter, categoryFilter]);

    const handleSelectIssue = (report: any) => {
        setSelectedIssue(report);
        if (report.location?.coordinates) {
            setFlyTo([report.location.coordinates[1], report.location.coordinates[0]]);
        }
    };

    const handleCloseDetail = () => {
        setSelectedIssue(null);
        setFlyTo(null);
    };

    return (
        <div className="min-h-screen bg-background animate-page-in">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
                    <div>
                        <p className="section-label mb-2">Civic Map</p>
                        <h1 className="display-md">Issue Map</h1>
                    </div>
                    {/* Status filter */}
                    <div className="flex gap-0 border border-gray-300 bg-white">
                        {["all", "pending", "in-progress", "resolved"].map(f => (
                            <button key={f} onClick={() => setStatusFilter(f)}
                                className={`px-4 py-2.5 text-[10px] uppercase tracking-widest font-semibold transition-colors border-r border-gray-300 last:border-r-0 ${statusFilter === f ? 'bg-[#1C1C1C] text-white' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                            >{f === 'in-progress' ? 'Active' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                        ))}
                    </div>
                </div>

                {/* Category filter */}
                {categories.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                        <button
                            onClick={() => setCategoryFilter("all")}
                            className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold border transition-colors ${categoryFilter === "all"
                                ? "bg-[#D52E25] text-white border-[#D52E25]"
                                : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                                }`}
                        >All Categories</button>
                        {categories.map(cat => (
                            <button key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold border transition-colors ${categoryFilter === cat
                                    ? "bg-[#D52E25] text-white border-[#D52E25]"
                                    : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                                    }`}
                            >{cat}</button>
                        ))}
                    </div>
                )}

                {/* Map + List + Detail grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-gray-200">
                    {/* Map */}
                    <div className={`${selectedIssue ? 'lg:col-span-1' : 'lg:col-span-2'} h-[400px] lg:h-[600px] border-b lg:border-b-0 lg:border-r border-gray-200 transition-all`}>
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
                                <FlyToMarker position={flyTo} />
                                {filteredReports
                                    .filter((r: any) => r.location?.coordinates)
                                    .map((report: any) => (
                                        <Marker key={report._id}
                                            position={[report.location.coordinates[1], report.location.coordinates[0]]}
                                            icon={createMarkerIcon(report.status, selectedIssue?._id === report._id)}
                                            eventHandlers={{ click: () => handleSelectIssue(report) }}
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

                    {/* Detail panel — shown when an issue is selected */}
                    {selectedIssue && (
                        <div className="bg-white border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto max-h-[400px] lg:max-h-[600px]">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
                                <h2 className="text-xs font-bold uppercase tracking-widest">Issue Detail</h2>
                                <button onClick={handleCloseDetail} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Image */}
                            {selectedIssue.imageUrl && (
                                <img src={selectedIssue.imageUrl} alt={selectedIssue.category} className="w-full h-48 object-cover" />
                            )}

                            <div className="p-5 space-y-4">
                                <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 ${statusConfig[selectedIssue.status]?.class || 'status-pending'}`}>
                                        {statusConfig[selectedIssue.status]?.label || selectedIssue.status}
                                    </span>
                                </div>

                                <h3 className="font-bold text-sm uppercase tracking-wider">{selectedIssue.category}</h3>

                                <div className="space-y-2 text-xs">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-600">{selectedIssue.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-gray-600">{formatTimeAgo(selectedIssue.createdAt)}</span>
                                    </div>
                                </div>

                                {selectedIssue.description && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-1">Description</p>
                                        <p className="text-xs text-gray-600 leading-relaxed">{selectedIssue.description}</p>
                                    </div>
                                )}

                                {selectedIssue.severity && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-1">Severity</p>
                                        <p className="text-xs font-semibold">Level {selectedIssue.severity}</p>
                                    </div>
                                )}

                                {/* Upvote button */}
                                <button
                                    onClick={() => upvoteMutation.mutate(selectedIssue._id)}
                                    disabled={upvoteMutation.isPending}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 text-xs font-bold uppercase tracking-widest hover:bg-[#D52E25] hover:text-white hover:border-[#D52E25] transition-colors"
                                >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    Upvote ({Array.isArray(selectedIssue.upvotes) ? selectedIssue.upvotes.length : selectedIssue.upvotes || 0})
                                </button>
                            </div>
                        </div>
                    )}

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
                                        onClick={() => handleSelectIssue(report)}
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
                                                        <ThumbsUp className="w-3 h-3" /> {Array.isArray(report.upvotes) ? report.upvotes.length : report.upvotes || 0}
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