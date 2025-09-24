import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Filter, Calendar, ThumbsUp, X, Loader2, ZoomIn } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// --- SETUP: Point Leaflet to assets ---
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// --- TYPE DEFINITION ---
interface Report {
  _id: string;
  category: string;
  description: string;
  address: string;
  status: 'pending' | 'in-progress' | 'resolved';
  createdAt: string;
  imageUrl?: string;
  afterImageUrl?: string;
  upvotes: string[];
  user: { email: string };
  location?: { coordinates: [number, number] }; // [longitude, latitude]
}

// --- HELPER COMPONENT TO FIX MAP SIZING IN MODAL ---
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// --- NEW IMAGE LIGHTBOX COMPONENT ---
const ImageLightbox = ({ imageUrl, onClose }: { imageUrl: string; onClose: () => void; }) => {
    return (
        <div className="fixed top-0 right-0 h-full w-full md:w-1/2 lg:w-2/5 z-40 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in slide-in-from-right">
            <div className="relative w-full h-full">
                <Button variant="secondary" size="icon" className="absolute top-2 right-2 rounded-full z-50" onClick={onClose}><X className="w-5 h-5"/></Button>
                <img src={imageUrl} alt="Enlarged issue" className="w-full h-full object-contain rounded-lg"/>
            </div>
        </div>
    )
}

// --- DETAIL MODAL COMPONENT ---
const IssueDetailModal = ({ issue, onClose }: { issue: Report; onClose: () => void; }) => {
    const queryClient = useQueryClient();
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const upvoteMutation = useMutation({
        mutationFn: (reportId: string) => api.put<{ success: boolean; data: Report }>(`/reports/${reportId}/upvote`),
        onSuccess: (response) => {
            const updatedReport = response.data.data;
            queryClient.setQueryData<Report[]>(['allReports'], (oldData) =>
                oldData?.map((r) => r._id === updatedReport._id ? updatedReport : r)
            );
        }
    });

    const handleUpvoteClick = () => {
        if (!isAuthenticated) navigate('/login');
        else upvoteMutation.mutate(issue._id);
    };
    
    const hasUpvoted = issue.upvotes.includes(user?._id ?? '');
    const issuePosition: [number, number] = issue.location ? [issue.location.coordinates[1], issue.location.coordinates[0]] : [18.5204, 73.8567];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle>{issue.category}</CardTitle>
                        <CardDescription>{issue.address}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5"/></Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground">{issue.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            {issue.imageUrl && <div><p className="font-semibold text-xs mb-1">Before</p><img src={issue.imageUrl} alt="Before" className="w-full h-40 object-cover rounded"/></div>}
                            {issue.afterImageUrl && <div><p className="font-semibold text-xs text-green-600 mb-1">After (Resolved)</p><img src={issue.afterImageUrl} alt="After" className="w-full h-40 object-cover rounded border-2 border-green-500"/></div>}
                        </div>
                        <div className="text-xs text-muted-foreground border-t pt-2">Reported by {issue.user.email} on {new Date(issue.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="space-y-4 flex flex-col">
                        <div className="flex-1 w-full rounded-lg overflow-hidden border">
                            <MapContainer center={issuePosition} zoom={15} className="h-full w-full">
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <Marker position={issuePosition} />
                                <MapResizer />
                            </MapContainer>
                        </div>
                        <Button variant={hasUpvoted ? "default" : "outline"} disabled={upvoteMutation.isPending} onClick={handleUpvoteClick}>
                            {upvoteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <ThumbsUp className="w-4 h-4 mr-2"/>}
                            {issue.upvotes.length} Upvotes { !isAuthenticated && "(Login to vote)"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function MapView() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedIssue, setSelectedIssue] = useState<Report | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const PUNE_CENTER: [number, number] = [18.5204, 73.8567];

  const { data: issues = [], isLoading, error } = useQuery<Report[]>({
    queryKey: ['allReports'],
    queryFn: async () => {
        const { data } = await api.get('/reports');
        return data.data;
    }
  });
  
  const upvoteMutation = useMutation({
    mutationFn: (reportId: string) => api.put<{ success: boolean; data: Report }>(`/reports/${reportId}/upvote`),
    onSuccess: (response) => {
        const updatedReport = response.data.data;
        queryClient.setQueryData<Report[]>(['allReports'], (oldData) =>
            oldData?.map((r) => r._id === updatedReport._id ? updatedReport : r)
        );
    }
  });

  const filteredIssues = issues.filter((issue) => {
    const categoryMatch = selectedCategory === "all" || issue.category === selectedCategory;
    const statusMatch = selectedStatus === "all" || issue.status === selectedStatus;
    const isVisibleInList = (issue.status === 'pending' || issue.status === 'in-progress');
    return categoryMatch && statusMatch && isVisibleInList;
  });

  const mapMarkers = issues.filter((issue) => 
    (selectedCategory === "all" || issue.category === selectedCategory) &&
    (selectedStatus === "all" || issue.status === selectedStatus)
  );

  const handleMarkerClick = (issue: Report) => {
    if (issue.imageUrl) {
        setLightboxImage(issue.imageUrl);
    } else {
        setSelectedIssue(issue); // Open details if no image
        toast({
            description: "This report has no image. Opening details view.",
        })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {selectedIssue && <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />}
      {lightboxImage && <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">City Issues Map</h1>
          <p className="text-lg text-muted-foreground">Click an issue's image for a preview, or a map marker to see its photo.</p>
        </div>

        <Card className="mb-8">
            <CardHeader><CardTitle><Filter className="w-5 h-5 inline-block mr-2"/>Filters</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}><SelectTrigger className="w-52"><SelectValue placeholder="All Categories"/></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem><SelectItem value="Roads & Potholes">Roads & Potholes</SelectItem><SelectItem value="Streetlights & Power">Streetlights & Power</SelectItem><SelectItem value="Sanitation & Waste">Sanitation & Waste</SelectItem><SelectItem value="Water & Utilities">Water & Utilities</SelectItem></SelectContent></Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}><SelectTrigger className="w-52"><SelectValue placeholder="All Statuses"/></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent></Select>
            </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle>Live Map of Issues</CardTitle></CardHeader>
                <CardContent>
                    <div className="h-[500px] rounded-lg overflow-hidden">
                        <MapContainer center={PUNE_CENTER} zoom={12} className="h-full w-full">
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {mapMarkers.map(issue => {
                                if (!issue.location?.coordinates) return null;
                                const position: [number, number] = [issue.location.coordinates[1], issue.location.coordinates[0]];
                                return (
                                    <Marker 
                                        key={issue._id} 
                                        position={position}
                                        eventHandlers={{ click: () => handleMarkerClick(issue) }}
                                    />
                                )
                            })}
                        </MapContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Recent Issues</CardTitle><CardDescription>{filteredIssues.length} active issues found</CardDescription></CardHeader>
                <CardContent>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {isLoading && <div className="text-center p-4"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div>}
                    {error && <p className="text-destructive">Failed to load issues.</p>}
                    {!isLoading && !error && filteredIssues.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No active issues found.</p>
                    )}
                    {filteredIssues.map((issue) => {
                        const hasUpvoted = issue.upvotes.includes(user?._id ?? '');
                        return (
                        <div key={issue._id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start gap-4">
                                {issue.imageUrl && (
                                    <div className="relative group flex-shrink-0">
                                        <img src={issue.imageUrl} alt="Issue" className="w-24 h-24 object-cover rounded"/>
                                        <div 
                                            onClick={() => setLightboxImage(issue.imageUrl!)}
                                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded"
                                        >
                                            <ZoomIn className="w-6 h-6 text-white"/>
                                        </div>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="font-semibold">{issue.category}</h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1"><MapPin className="w-4 h-4"/>{issue.address}</p>
                                    <p className="text-xs text-muted-foreground mt-1"><Calendar className="w-3 h-3 inline mr-1"/>{new Date(issue.createdAt).toLocaleDateString()}</p>
                                    <Badge variant={issue.status === 'pending' ? 'warning' : 'default'} className="capitalize mt-2">{issue.status.replace('-', ' ')}</Badge>
                                </div>
                                <Button variant={hasUpvoted ? "default" : "outline"} size="sm" disabled={!isAuthenticated || upvoteMutation.isPending} onClick={(e) => { e.stopPropagation(); upvoteMutation.mutate(issue._id); }}>
                                    {upvoteMutation.isPending && upvoteMutation.variables === issue._id ? <Loader2 className="w-4 h-4 animate-spin"/> : <ThumbsUp className="w-4 h-4"/>}
                                    <span className="ml-2">{issue.upvotes.length}</span>
                                </Button>
                            </div>
                            <div className="text-right mt-2">
                                <Button variant="link" size="sm" onClick={() => setSelectedIssue(issue)}>View Details</Button>
                            </div>
                        </div>
                        )
                    })}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}