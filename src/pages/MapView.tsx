import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Filter, Calendar, ThumbsUp, Loader2, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
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

// --- NEW IN-PANEL DETAIL VIEW COMPONENT ---
const IssueDetailView = ({
    issue,
    onBack,
    onUpvote,
    isUpvoting,
    hasUpvoted,
    isAuthenticated,
}: {
    issue: Report;
    onBack: () => void;
    onUpvote: (id: string) => void;
    isUpvoting: boolean;
    hasUpvoted: boolean;
    isAuthenticated: boolean;
}) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {issue.imageUrl && (
                    <img src={issue.imageUrl} alt={issue.category} className="w-full h-48 object-cover rounded-lg"/>
                )}
                <div>
                    <h3 className="font-semibold text-lg">{issue.category}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1"><MapPin className="w-4 h-4"/>{issue.address}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-sm mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                    Reported on {new Date(issue.createdAt).toLocaleDateString()}
                </div>
            </div>
            <div className="border-t pt-4 mt-4 flex justify-between items-center">
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4 mr-2"/>
                    Back to list
                </Button>
                <Button variant={hasUpvoted ? "default" : "outline"} disabled={!isAuthenticated || isUpvoting} onClick={() => onUpvote(issue._id)}>
                    {isUpvoting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <ThumbsUp className="w-4 h-4 mr-2"/>}
                    {issue.upvotes.length} Upvotes
                </Button>
            </div>
        </div>
    );
};


export default function MapView() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedIssue, setSelectedIssue] = useState<Report | null>(null);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
        // If the selected issue is the one being upvoted, update it in state too
        if (selectedIssue?._id === updatedReport._id) {
            setSelectedIssue(updatedReport);
        }
    }
  });

  const handleUpvoteClick = (issueId: string) => {
    if (!isAuthenticated) {
        navigate('/login');
    } else {
        upvoteMutation.mutate(issueId);
    }
  }

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">City Issues Map</h1>
          <p className="text-lg text-muted-foreground">Click on an issue or a map marker to see details.</p>
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
                                        eventHandlers={{ click: () => setSelectedIssue(issue) }}
                                    />
                                )
                            })}
                        </MapContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>{selectedIssue ? "Issue Details" : "Recent Issues"}</CardTitle>
                    <CardDescription>{selectedIssue ? selectedIssue.category : `${filteredIssues.length} active issues found`}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    <div className="h-[440px]">
                        {selectedIssue ? (
                            <IssueDetailView 
                                issue={selectedIssue}
                                onBack={() => setSelectedIssue(null)}
                                onUpvote={handleUpvoteClick}
                                isUpvoting={upvoteMutation.isPending}
                                hasUpvoted={selectedIssue.upvotes.includes(user?._id ?? '')}
                                isAuthenticated={isAuthenticated}
                            />
                        ) : (
                            <div className="space-y-4 h-full overflow-y-auto pr-2">
                                {isLoading && <div className="text-center p-4"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div>}
                                {error && <p className="text-destructive">Failed to load issues.</p>}
                                {!isLoading && !error && filteredIssues.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No active issues found.</p>
                                )}
                                {filteredIssues.map((issue) => {
                                    const hasUpvoted = issue.upvotes.includes(user?._id ?? '');
                                    return (
                                    <div key={issue._id} className="border rounded-lg p-4 hover:bg-slate-100 cursor-pointer transition-colors" onClick={() => setSelectedIssue(issue)}>
                                        <div className="flex justify-between items-start gap-4">
                                            {issue.imageUrl && (
                                                <img src={issue.imageUrl} alt="Issue" className="w-20 h-20 object-cover rounded flex-shrink-0"/>
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-semibold">{issue.category}</h3>
                                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-4 h-4"/>{issue.address}</p>
                                                <Badge variant={issue.status === 'pending' ? 'warning' : 'default'} className="capitalize mt-2">{issue.status.replace('-', ' ')}</Badge>
                                            </div>
                                            <Button variant={hasUpvoted ? "default" : "outline"} size="sm" disabled={!isAuthenticated || upvoteMutation.isPending} onClick={(e) => { e.stopPropagation(); handleUpvoteClick(issue._id); }}>
                                                {upvoteMutation.isPending && upvoteMutation.variables === issue._id ? <Loader2 className="w-4 h-4 animate-spin"/> : <ThumbsUp className="w-4 h-4"/>}
                                                <span className="ml-2">{issue.upvotes.length}</span>
                                            </Button>
                                        </div>
                                    </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}