import { useState, useRef } from "react";
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
  MapPin, Calendar, Image as ImageIcon, Search, Filter, Trash2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import api from "../lib/api";

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

  const [showAfterImageModal, setShowAfterImageModal] = useState(false);
  const [pendingResolve, setPendingResolve] = useState<string | null>(null);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [isAfterImageUploading, setIsAfterImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const deleteImageMutation = useMutation({
    mutationFn: ({ reportId, imageType }: { reportId: string, imageType: 'before' | 'after' }) => {
      return api.delete(`/reports/${reportId}/image`, { data: { imageType } });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Image deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["allReports"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.response?.data?.message || "Failed to delete image." });
    },
  });
  
  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => {
      return api.delete(`/reports/${reportId}`);
    },
    onSuccess: () => {
        toast({ title: "Report Deleted", description: "The report has been permanently removed." });
        queryClient.invalidateQueries({ queryKey: ["allReports"] });
        queryClient.invalidateQueries({ queryKey: ["reportStats"] });
    },
    onError: (error: any) => {
        toast({ variant: "destructive", title: "Deletion Failed", description: error.response?.data?.message || "Could not delete the report." });
    },
  });

  const handleDeleteImage = (reportId: string, imageType: 'before' | 'after') => {
    if (window.confirm(`Are you sure you want to delete this ${imageType} image? This cannot be undone.`)) {
      deleteImageMutation.mutate({ reportId, imageType });
    }
  };

  const handleDeleteReport = (reportId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this entire report? This action cannot be undone.")) {
        deleteReportMutation.mutate(reportId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "warning";
      case "in-progress": return "default";
      case "resolved": return "success";
      default: return "outline";
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: string, file?: File) => {
    try {
      const formData = new FormData();
      formData.append("status", newStatus);
      if (file) {
        formData.append("afterImage", file);
      }
      await api.put(`/reports/${reportId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      queryClient.invalidateQueries({ queryKey: ["allReports"] });
      queryClient.invalidateQueries({ queryKey: ["reportStats"] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.response?.data?.message || error.message });
    }
  };

  const handleStatusChange = (reportId: string, value: string) => {
    if (value === "resolved") {
      setPendingResolve(reportId);
      setShowAfterImageModal(true);
    } else {
      updateReportStatus(reportId, value);
    }
  };

  const onAfterImageSubmit = async () => {
    if (pendingResolve && afterImageFile) {
      setShowAfterImageModal(false);
      setIsAfterImageUploading(true);
      await updateReportStatus(pendingResolve, "resolved", afterImageFile);
      setIsAfterImageUploading(false);
      setPendingResolve(null);
      setAfterImageFile(null);
    }
  };

  const filteredReports = reports?.filter((report: any) =>
    (statusFilter === "all" || report.status === statusFilter) &&
    (categoryFilter === "all" || report.category === categoryFilter) &&
    (searchQuery === "" ||
      report.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const categories = [...new Set(reports?.map((report: any) => report.category) || [])];
  
  if (isLoadingStats || isLoadingReports) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf4fb] via-[#f8fafc] to-[#eaf4fb] w-full">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-10">
        <div className="mb-7 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-900 mb-1 tracking-tight">
            Admin Dashboard
          </h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats?.total ?? 0}</p><p>Total Reports</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats?.pending ?? 0}</p><p>Pending</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats?.inProgress ?? 0}</p><p>In Progress</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats?.resolved ?? 0}</p><p>Resolved</p></CardContent></Card>
        </div>
        <Card className="shadow-civic border border-blue-100 mb-6 sm:mb-10">
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-6">
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full md:w-64"
            />
            <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                            <SelectItem key={String(category)} value={String(category)}>{String(category)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </CardContent>
        </Card>
        <div className="hidden md:block">
          <Card className="shadow-civic-strong border border-blue-100">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report: any) => (
                    <TableRow key={report._id}>
                      <TableCell>
                          <div className="flex flex-col gap-2 items-center">
                              {report.imageUrl && (
                                <div className="relative group w-16 h-16">
                                  <img src={report.imageUrl} alt="Report" className="w-full h-full object-cover rounded"/>
                                  <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition bg-black/50 rounded">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-white" onClick={() => setSelectedImage(report.imageUrl!)}><Eye className="w-4 h-4" /></Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-red-500" onClick={() => handleDeleteImage(report._id, 'before')}><Trash2 className="w-4 h-4" /></Button>
                                  </div>
                                </div>
                              )}
                              {report.afterImageUrl && (
                                <div className="relative group w-16 h-16 mt-1">
                                  <img src={report.afterImageUrl} alt="After" className="w-full h-full object-cover rounded border-green-300"/>
                                  <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition bg-black/50 rounded">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-white" onClick={() => setSelectedImage(report.afterImageUrl!)}><Eye className="w-4 h-4" /></Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-red-500" onClick={() => handleDeleteImage(report._id, 'after')}><Trash2 className="w-4 h-4" /></Button>
                                  </div>
                                </div>
                              )}
                          </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{report.title || report.category}</p>
                        <p className="text-xs text-muted-foreground">{report.description}</p>
                      </TableCell>
                      <TableCell>{report.address}</TableCell>
                      <TableCell>{report.user.email}</TableCell>
                      <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select value={report.status} onValueChange={value => handleStatusChange(report._id, value)}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteReport(report._id)}>
                                {deleteReportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        {/* Mobile View */}
        <div className="grid gap-4 md:hidden">
            {filteredReports.map((report: any) => (
                <Card key={report._id}>
                    <CardHeader>
                        <CardTitle>{report.title || report.category}</CardTitle>
                        <CardDescription>{report.address}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm">{report.description}</p>
                        <div className="flex gap-2">
                            {report.imageUrl && <img src={report.imageUrl} className="w-20 h-20 rounded object-cover" />}
                            {report.afterImageUrl && <img src={report.afterImageUrl} className="w-20 h-20 rounded object-cover" />}
                        </div>
                        <Select value={report.status} onValueChange={value => handleStatusChange(report._id, value)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteReport(report._id)}>
                            {deleteReportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Trash2 className="w-4 h-4 mr-2" />}
                            Delete Report
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
        {selectedImage && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
                <img src={selectedImage} alt="Enlarged view" className="max-w-[90vw] max-h-[90vh] rounded" />
            </div>
        )}
        {showAfterImageModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <Card className="w-full max-w-md">
                    <CardHeader><CardTitle>Upload 'After' Image</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <Input type="file" accept="image/*" onChange={e => setAfterImageFile(e.target.files?.[0] || null)} />
                        {afterImageFile && <img src={URL.createObjectURL(afterImageFile)} className="mt-2 rounded max-h-60" />}
                        <div className="flex gap-4">
                            <Button onClick={onAfterImageSubmit} disabled={!afterImageFile || isAfterImageUploading}>Upload and Resolve</Button>
                            <Button variant="outline" onClick={() => setShowAfterImageModal(false)}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}
      </div>
    </div>
  );
}