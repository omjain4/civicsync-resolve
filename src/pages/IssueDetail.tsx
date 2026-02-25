import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    MapPin, Clock, CheckCircle, AlertTriangle, ThumbsUp, Trash2,
    ImagePlus, ArrowLeft, Camera, Shield, ShieldAlert, ShieldCheck, Loader2, Users
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Report {
    _id: string;
    user: { _id: string; email?: string; username?: string } | string;
    category: string;
    title?: string;
    description: string;
    imageUrl?: string;
    afterImageUrl?: string;
    address: string;
    status: string;
    priority: string;
    severity?: number;
    createdAt: string;
    upvotes: string[];
    assignedDepartment?: string;
    location?: { coordinates: number[] };
}

const statusConfig: Record<string, { class: string; icon: any; label: string; color: string }> = {
    pending: { class: "status-pending", icon: Clock, label: "Pending", color: "#f59e0b" },
    "in-progress": { class: "status-in-progress", icon: AlertTriangle, label: "In Progress", color: "#3b82f6" },
    resolved: { class: "status-resolved", icon: CheckCircle, label: "Resolved", color: "#10b981" },
};

const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
});

// Simple EXIF-like metadata extraction from image URL headers
const extractImageMeta = async (url: string) => {
    try {
        const resp = await fetch(url, { method: "HEAD" });
        return {
            contentType: resp.headers.get("content-type") || "Unknown",
            size: resp.headers.get("content-length")
                ? `${(parseInt(resp.headers.get("content-length")!) / 1024).toFixed(1)} KB`
                : "Unknown",
            lastModified: resp.headers.get("last-modified") || "Unknown",
        };
    } catch {
        return null;
    }
};

export default function IssueDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [imgMeta, setImgMeta] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [similarIssues, setSimilarIssues] = useState<Report[]>([]);

    const { data: report, isLoading, error } = useQuery<Report>({
        queryKey: ["report", id],
        queryFn: async () => {
            const { data } = await api.get(`/reports/${id}`);
            return data.data;
        },
        enabled: !!id,
    });

    // Fetch all reports to find similar/duplicate issues
    const { data: allReports } = useQuery<Report[]>({
        queryKey: ["reports"],
        queryFn: async () => (await api.get("/reports")).data.data,
    });

    // Find similar issues (same category + within ~0.005 degrees ≈ 500m)
    useEffect(() => {
        if (!report || !allReports || !report.location?.coordinates) return;
        const [lng, lat] = report.location.coordinates;
        const similar = allReports.filter((r) => {
            if (r._id === report._id) return false;
            if (r.category !== report.category) return false;
            if (!r.location?.coordinates) return false;
            const [rLng, rLat] = r.location.coordinates;
            const dist = Math.sqrt((rLng - lng) ** 2 + (rLat - lat) ** 2);
            return dist < 0.005; // ~500m
        });
        setSimilarIssues(similar);
    }, [report, allReports]);

    // Extract image metadata
    useEffect(() => {
        if (report?.imageUrl) {
            extractImageMeta(report.imageUrl).then(setImgMeta);
        }
    }, [report?.imageUrl]);

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: () => api.delete(`/reports/${id}`),
        onSuccess: () => {
            toast({ title: "Report deleted" });
            queryClient.invalidateQueries({ queryKey: ["reports"] });
            queryClient.invalidateQueries({ queryKey: ["myIssues"] });
            navigate("/my-issues");
        },
        onError: (err: any) => toast({
            title: "Delete failed", description: err.response?.data?.message, variant: "destructive"
        }),
    });

    // Upvote with optimistic update for instant feedback
    const upvoteMutation = useMutation({
        mutationFn: () => api.put(`/reports/${id}/upvote`),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ["report", id] });
            const previous = queryClient.getQueryData(["report", id]);
            queryClient.setQueryData(["report", id], (old: any) => {
                if (!old) return old;
                const hasUpvoted = old.upvotes?.includes(user?._id) || old.upvotes?.includes('optimistic');
                const newUpvotes = hasUpvoted
                    ? old.upvotes.filter((u: any) => u !== user?._id && u !== 'optimistic')
                    : [...(old.upvotes || []), user?._id || "optimistic"];
                return { ...old, upvotes: newUpvotes };
            });
            return { previous };
        },
        onError: (err: any, _vars, context) => {
            queryClient.setQueryData(["report", id], context?.previous);
            toast({ title: "Could not upvote", description: err.response?.data?.message || "Login required", variant: "destructive" });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["report", id] });
            queryClient.invalidateQueries({ queryKey: ["reports"] });
        },
    });

    // Change image mutation
    const changeImageMutation = useMutation({
        mutationFn: (formData: FormData) =>
            api.put(`/reports/${id}/image`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["report", id] });
            toast({ title: "Image updated!" });
        },
        onError: (err: any) => toast({
            title: "Image update failed", description: err.response?.data?.message, variant: "destructive"
        }),
    });

    const handleImageChange = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file) {
                const formData = new FormData();
                formData.append("image", file);
                changeImageMutation.mutate(formData);
            }
        };
        input.click();
    };

    const isOwner = report && user && (
        typeof report.user === 'string' ? report.user === user._id : report.user._id === user._id
    );
    const isAdmin = user?.role === "admin";
    const canDelete = isOwner || isAdmin;
    const canChangeImage = isOwner && report?.status === "pending";

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#D52E25]" />
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-sm text-gray-500">Issue not found.</p>
                <button onClick={() => navigate(-1)} className="text-xs uppercase tracking-widest font-bold text-[#D52E25] hover:underline">
                    ← Go back
                </button>
            </div>
        );
    }

    const config = statusConfig[report.status] || statusConfig.pending;
    const StatusIcon = config.icon;

    return (
        <div className="min-h-screen bg-background animate-page-in">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Back button */}
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-gray-500 hover:text-[#D52E25] mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>

                {/* Similar issue notification */}
                {similarIssues.length > 0 && (
                    <div className="bg-amber-50 border-2 border-amber-300 p-4 mb-6 flex items-start gap-3">
                        <Users className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-1">Collaborative Issue Detected</p>
                            <p className="text-xs text-amber-700">
                                Your complaint is registered collaboratively with <strong>{similarIssues.length} similar {similarIssues.length === 1 ? "report" : "reports"}</strong> in the same area.
                                This helps prioritize the issue for faster resolution.
                            </p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <p className="section-label mb-1">{report.assignedDepartment || "Unassigned"}</p>
                        <h1 className="text-2xl font-extrabold uppercase tracking-wide">{report.category}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 ${config.class}`}>
                                <StatusIcon className="w-3 h-3 inline mr-1" />
                                {config.label}
                            </span>
                            {report.priority && (
                                <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-gray-100 text-gray-600">
                                    {report.priority} priority
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                        <button
                            onClick={() => upvoteMutation.mutate()}
                            disabled={upvoteMutation.isPending}
                            className={`flex items-center gap-1.5 px-4 py-2.5 border text-xs font-bold uppercase tracking-widest transition-colors ${report.upvotes?.includes(user?._id) || report.upvotes?.includes('optimistic')
                                ? 'bg-[#D52E25] text-white border-[#D52E25]'
                                : 'border-gray-300 text-gray-700 hover:bg-[#D52E25] hover:text-white hover:border-[#D52E25]'
                                }`}
                        >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {report.upvotes?.length || 0}
                        </button>
                        {canDelete && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-2.5 border border-red-300 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Delete confirmation */}
                {showDeleteConfirm && (
                    <div className="bg-red-50 border-2 border-red-300 p-4 mb-6 flex items-center justify-between">
                        <p className="text-xs font-bold text-red-800">Are you sure you want to delete this report? This cannot be undone.</p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold border border-gray-300 hover:bg-gray-100">Cancel</button>
                            <button
                                onClick={() => deleteMutation.mutate()}
                                disabled={deleteMutation.isPending}
                                className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold bg-red-500 text-white hover:bg-red-600"
                            >
                                {deleteMutation.isPending ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Images section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-200 mb-6">
                    {/* Before image */}
                    <div className="relative bg-gray-50">
                        {report.status === "resolved" && (
                            <div className="absolute top-3 left-3 z-10 bg-[#1C1C1C] text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1">Before</div>
                        )}
                        {report.imageUrl ? (
                            <img src={report.imageUrl} alt={report.category} className="w-full h-72 object-cover" />
                        ) : (
                            <div className="h-72 flex items-center justify-center">
                                <Camera className="w-8 h-8 text-gray-300" />
                            </div>
                        )}
                        {canChangeImage && (
                            <button
                                onClick={handleImageChange}
                                disabled={changeImageMutation.isPending}
                                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-widest border border-gray-300 hover:bg-[#D52E25] hover:text-white hover:border-[#D52E25] transition-colors"
                            >
                                <ImagePlus className="w-3 h-3" />
                                {changeImageMutation.isPending ? "Uploading..." : "Change Image"}
                            </button>
                        )}
                    </div>

                    {/* After image (only if resolved) */}
                    {report.status === "resolved" ? (
                        <div className="relative bg-gray-50 border-l border-gray-200">
                            <div className="absolute top-3 left-3 z-10 bg-[#10b981] text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1">After</div>
                            {report.afterImageUrl ? (
                                <img src={report.afterImageUrl} alt="After resolution" className="w-full h-72 object-cover" />
                            ) : (
                                <div className="h-72 flex items-center justify-center">
                                    <p className="text-xs text-gray-400 uppercase tracking-widest">No after image uploaded</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="border-l border-gray-200 bg-gray-50/50 h-72 flex items-center justify-center">
                            <div className="text-center">
                                <CheckCircle className="w-6 h-6 text-gray-200 mx-auto mb-2" />
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest">After image available</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest">when resolved</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-gray-200 mb-6">
                    {/* Description */}
                    <div className="md:col-span-2 p-6 border-r border-gray-200">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Description</h3>
                        <p className="text-sm leading-relaxed text-gray-700">{report.description}</p>

                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Location</h4>
                                <div className="flex items-start gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-600">{report.address}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Submitted</h4>
                                <div className="flex items-start gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-gray-600">{formatDate(report.createdAt)}</p>
                                </div>
                            </div>
                        </div>

                        {report.severity && (
                            <div className="mt-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Severity</h4>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <div key={s} className={`w-6 h-2 ${s <= report.severity! ? "bg-[#D52E25]" : "bg-gray-200"}`} />
                                    ))}
                                    <span className="text-[10px] font-bold ml-2">{report.severity}/5</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Image metadata verification */}
                    <div className="p-6 bg-gray-50">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                            <Shield className="w-3 h-3" /> Image Verification
                        </h3>
                        {imgMeta ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-gray-400">Type</p>
                                    <p className="text-xs font-bold">{imgMeta.contentType}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-gray-400">File Size</p>
                                    <p className="text-xs font-bold">{imgMeta.size}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-gray-400">Last Modified</p>
                                    <p className="text-xs font-bold">{imgMeta.lastModified}</p>
                                </div>
                                <div className="pt-2 border-t border-gray-200">
                                    {report.location?.coordinates ? (
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                                            <p className="text-[10px] font-bold text-green-700">Location data present</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5">
                                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                            <p className="text-[10px] font-bold text-amber-700">No location data</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-[10px] text-gray-400">Loading metadata...</p>
                        )}
                    </div>
                </div>

                {/* Similar issues section */}
                {similarIssues.length > 0 && (
                    <div className="border border-gray-200 mb-6">
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-[#D52E25]" />
                                Similar Reports Nearby ({similarIssues.length})
                            </h3>
                        </div>
                        {similarIssues.map((s) => (
                            <div
                                key={s._id}
                                onClick={() => navigate(`/issues/${s._id}`)}
                                className="p-4 border-b border-gray-200 last:border-b-0 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                {s.imageUrl ? (
                                    <img src={s.imageUrl} alt="" className="w-12 h-12 object-cover border flex-shrink-0" />
                                ) : (
                                    <div className="w-12 h-12 bg-gray-100 flex items-center justify-center border flex-shrink-0">
                                        <Camera className="w-4 h-4 text-gray-300" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold uppercase truncate">{s.category}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{s.address}</p>
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 flex-shrink-0 ${statusConfig[s.status]?.class || 'status-pending'}`}>
                                    {s.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
