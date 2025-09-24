import { useState, useRef, ReactNode } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Eye, Edit, CheckCircle, Clock, AlertTriangle, FileText, Loader2,
  MapPin, Calendar, Image as ImageIcon, Search, Filter, Trash2, X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import api from "../lib/api";

// --- Reusable Confirmation Dialog Component ---
const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isLoading: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <Card className="w-full max-w-md m-4">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end gap-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const fetchReportStats = async () => {
  const { data } = await api.get("/reports/stats");
  return data.data;
};
const fetchAllReports = async () => {
  const { data } = await api.get("/reports");
  return data.data;
};

export default function AdminDashboard() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ action: () => void; title: string; desc: string } | null>(null);

  // --- RESTORED STATE ---
  const [showAfterImageModal, setShowAfterImageModal] = useState(false);
  const [pendingResolve, setPendingResolve] = useState<string | null>(null);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [isAfterImageUploading, setIsAfterImageUploading] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["reportStats"],
    queryFn: fetchReportStats,
  });
  const { data: reports, isLoading: isLoadingReports } = useQuery({
    queryKey: ["allReports"],
    queryFn: fetchAllReports,
  });

  const mutationOptions = (successMessage: string) => ({
    onSuccess: () => {
      toast({ title: "Success", description: successMessage });
      queryClient.invalidateQueries({ queryKey: ["allReports"] });
      queryClient.invalidateQueries({ queryKey: ["reportStats"] });
      setConfirmState(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Operation Failed", description: error.response?.data?.message || "An unexpected error occurred." });
      setConfirmState(null);
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: ({ reportId, imageType }: { reportId: string, imageType: 'after' }) => 
      api.delete(`/reports/${reportId}/image`, { data: { imageType } }),
    ...mutationOptions("The resolved image has been deleted and the issue is now pending."),
  });
  
  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => api.delete(`/reports/${reportId}`),
    ...mutationOptions("The report has been permanently deleted."),
  });

  const handleDeleteResolvedImage = (reportId: string) => {
    setConfirmState({
        action: () => deleteImageMutation.mutate({ reportId, imageType: 'after' }),
        title: "Delete Resolved Image?",
        desc: "This will delete the 'After' image and change the report status back to 'Pending'. You will be able to upload a new image by setting the status to 'Resolved' again. Are you sure?"
    });
  };

  const handleDeleteReport = (reportId: string) => {
    setConfirmState({
        action: () => deleteReportMutation.mutate(reportId),
        title: "Delete Report Permanently?",
        desc: "This will permanently delete the entire report, including all its data and images. This action cannot be undone."
    });
  };

  // --- RESTORED LOGIC ---
  const updateReportStatus = async (reportId: string, newStatus: string, file?: File) => {
    try {
      const formData = new FormData();
      formData.append("status", newStatus);
      if (file) {
        formData.append("afterImage", file);
      }
      await api.put(`/reports/${reportId}`, formData, { 
        headers: { "Content-Type": "multipart/form-data" } 
      });
      toast({ title: "Success", description: "Report status updated." });
      queryClient.invalidateQueries({ queryKey: ["allReports"] });
      queryClient.invalidateQueries({ queryKey: ["reportStats"] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.response?.data?.message || error.message });
    }
  };

  const handleStatusChange = (reportId: string, value: string) => {
    const report = reports.find((r: any) => r._id === reportId);
    if (!report) return;

    // Open modal ONLY if moving to 'resolved' AND there's no after-image yet
    if (value === "resolved" && !report.afterImageUrl) {
      setPendingResolve(reportId);
      setShowAfterImageModal(true);
      setAfterImageFile(null); // Reset file input
    } else {
      updateReportStatus(reportId, value);
    }
  };

  const onAfterImageSubmit = async () => {
    if (!pendingResolve || !afterImageFile) {
        toast({
            variant: "destructive",
            title: "File Required",
            description: "Please select an image to upload.",
        });
        return;
    }
    
    setIsAfterImageUploading(true);
    await updateReportStatus(pendingResolve, "resolved", afterImageFile);
    setIsAfterImageUploading(false);
    
    setShowAfterImageModal(false);
    setPendingResolve(null);
    setAfterImageFile(null);
  };

  const filteredReports = reports?.filter((report: any) =>
    (statusFilter === "all" || report.status === statusFilter) &&
    (categoryFilter === "all" || report.category === categoryFilter) &&
    (searchQuery === "" ||
      report.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const categories = [...new Set(reports?.map((report: any) => report.category) || [])] as string[];
  
  if (isLoadingStats || isLoadingReports) {
    return (
      <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-background w-full">
      <div className="container mx-auto px-4 py-8">
        
        <ConfirmationDialog 
            isOpen={!!confirmState}
            onClose={() => setConfirmState(null)}
            onConfirm={() => confirmState?.action()}
            title={confirmState?.title || ""}
            description={confirmState?.desc || ""}
            isLoading={deleteReportMutation.isPending || deleteImageMutation.isPending}
        />

        {selectedImage && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
            <img src={selectedImage} alt="Enlarged" className="max-w-full max-h-full rounded-lg"/>
            <Button variant="secondary" size="icon" className="absolute top-4 right-4 rounded-full" onClick={() => setSelectedImage(null)}><X/></Button>
          </div>
        )}

        {/* --- RESTORED MODAL JSX --- */}
        {showAfterImageModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
                <Card className="w-full max-w-md m-4">
                    <CardHeader>
                        <CardTitle>Upload 'After' Image</CardTitle>
                        <CardDescription>
                            To mark this issue as 'Resolved', you must upload an image showing the completed work.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input 
                            type="file" 
                            accept="image/*" 
                            onChange={e => setAfterImageFile(e.target.files?.[0] || null)} 
                        />
                        {afterImageFile && (
                            <div className="mt-2 rounded-md border p-2">
                                <img 
                                    src={URL.createObjectURL(afterImageFile)} 
                                    alt="Preview" 
                                    className="max-h-60 w-full object-contain"
                                />
                            </div>
                        )}
                        <div className="flex justify-end gap-4">
                            <Button variant="outline" onClick={() => setShowAfterImageModal(false)} disabled={isAfterImageUploading}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={onAfterImageSubmit} 
                                disabled={!afterImageFile || isAfterImageUploading}
                            >
                                {isAfterImageUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Upload and Resolve
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        <div className="mb-8"><h1 className="text-4xl font-bold">Admin Dashboard</h1></div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <Card><CardHeader><CardTitle>{stats?.total ?? 0}</CardTitle><CardDescription>Total</CardDescription></CardHeader></Card>
            <Card><CardHeader><CardTitle>{stats?.pending ?? 0}</CardTitle><CardDescription>Pending</CardDescription></CardHeader></Card>
            <Card><CardHeader><CardTitle>{stats?.inProgress ?? 0}</CardTitle><CardDescription>In Progress</CardDescription></CardHeader></Card>
            <Card><CardHeader><CardTitle>{stats?.resolved ?? 0}</CardTitle><CardDescription>Resolved</CardDescription></CardHeader></Card>
        </div>
        
        <Card className="mb-8"><CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 p-4"><Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="md:w-64" /><div className="flex gap-2"><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent></Select><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>

        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Image</TableHead><TableHead>Details</TableHead><TableHead>Location</TableHead><TableHead>Reporter</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredReports.map((report: any) => (
                <TableRow key={report._id}>
                  <TableCell>
                      <div className="flex flex-col gap-2">
                          {report.imageUrl && <img src={report.imageUrl} className="w-20 h-16 object-cover rounded cursor-pointer" onClick={() => setSelectedImage(report.imageUrl)} />}
                          {report.afterImageUrl && <div className="relative group"><img src={report.afterImageUrl} className="w-20 h-16 object-cover rounded border-2 border-green-500 cursor-pointer" onClick={() => setSelectedImage(report.afterImageUrl)} /><Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteResolvedImage(report._id)}><Trash2 className="w-3 h-3"/></Button></div>}
                      </div>
                  </TableCell>
                  <TableCell><div className="font-medium">{report.title}</div><div className="text-sm text-muted-foreground max-w-xs truncate">{report.description}</div></TableCell>
                  <TableCell>{report.address}</TableCell>
                  <TableCell>{report.user.email}</TableCell>
                  <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Select value={report.status} onValueChange={value => handleStatusChange(report._id, value)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                      <Button variant="destructive" onClick={() => handleDeleteReport(report._id)}><Trash2 className="w-4 h-4 mr-2"/>Delete Report</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}