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
  MapPin, Calendar, Image as ImageIcon, Search, Filter,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ["reportStats"],
    queryFn: fetchReportStats,
    retry: 1,
  });
  const { data: reports, isLoading: isLoadingReports, error: reportsError } = useQuery({
    queryKey: ["allReports"],
    queryFn: fetchAllReports,
    retry: 1,
  });

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

  // MAIN LOGIC: Only allow "resolved" with after image
  const updateReportStatus = async (reportId: string, newStatus: string, file?: File) => {
    try {
      let data: any = { status: newStatus };
      let config = {};
      if (newStatus === "resolved" && file) {
        data = new FormData();
        data.append("status", "resolved");
        data.append("afterImage", file);
        config = { headers: { "Content-Type": "multipart/form-data" } };
      }
      await api.put(`/reports/${reportId}`, data, config);
      queryClient.invalidateQueries({ queryKey: ["allReports"] });
    } catch (error) {
      alert(
        "Failed to update report status: " +
          (error?.response?.data?.message || error.message)
      );
    }
  };

  const handleStatusChange = (reportId: string, value: string) => {
    if (value === "resolved") {
      setPendingResolve(reportId);
      setShowAfterImageModal(true);
      setAfterImageFile(null);
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
  const onAfterImageCancel = () => {
    setShowAfterImageModal(false);
    setPendingResolve(null);
    setAfterImageFile(null);
  };

  const filteredReports =
    reports?.filter((report) => {
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || report.category === categoryFilter;
      const matchesSearch =
        searchQuery === "" ||
        report.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesCategory && matchesSearch;
    }) || [];

  const categories = [...new Set(reports?.map((report) => report.category) || [])];

  if (isLoadingStats || isLoadingReports) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-700 mx-auto mb-4" />
          <p className="text-lg text-blue-900">Loading Dashboard Data...</p>
        </div>
      </div>
    );
  }
  if (statsError || reportsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-blue-900">Failed to Load Dashboard</h2>
          <p className="text-blue-800">
            Error loading dashboard data. Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf4fb] via-[#f8fafc] to-[#eaf4fb]">
      <div className="container mx-auto px-4 py-10">
        {/* Loading overlay for after image */}
        {isAfterImageUploading && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
            <div className="flex flex-col items-center bg-white px-10 py-10 rounded-lg shadow-md">
              <Loader2 className="w-12 h-12 animate-spin text-blue-700 mb-4" />
              <div className="text-blue-900 font-semibold text-lg">Uploading After Image…</div>
              <div className="text-blue-800 mt-2">Please wait until the process finishes.</div>
            </div>
          </div>
        )}

        {/* DASH HEADER */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-1 tracking-tight">
            Admin Dashboard
          </h1>
          <div className="text-lg text-blue-700 font-medium mb-2">
            Review, update, and resolve civic complaints citywide
          </div>
          <hr className="border-blue-100 mb-6" />
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <StatCard icon={<FileText className="w-8 h-8 mb-1 text-blue-800" />} value={stats?.total ?? 0} label="Total Reports" />
          <StatCard icon={<Clock className="w-8 h-8 mb-1 text-yellow-700" />} value={stats?.pending ?? 0} label="Pending" border="border-yellow-200" color="text-yellow-700" />
          <StatCard icon={<AlertTriangle className="w-8 h-8 mb-1 text-blue-800" />} value={stats?.inProgress ?? 0} label="In Progress" border="border-blue-200" />
          <StatCard icon={<CheckCircle className="w-8 h-8 mb-1 text-green-700" />} value={stats?.resolved ?? 0} label="Resolved" border="border-green-200" color="text-green-800" />
        </div>

        {/* Search/filter */}
        <Card className="shadow-civic border border-blue-100 mb-10 pt-3">
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pt-3">
            <div className="flex gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Search className="w-5 h-5 text-blue-700" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full md:w-64 border-blue-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-700" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 border-blue-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44 border-blue-200">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={String(category)} value={String(category)}>
                      {String(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-blue-700 whitespace-nowrap">
              Showing <span className="font-bold">{filteredReports.length}</span> of&nbsp;
              <span className="font-bold">{reports?.length || 0}</span> reports
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-civic-strong border border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-800 font-semibold text-xl">
              Civic Issues Management
            </CardTitle>
            <CardDescription>
              Change status/update reports below. Click issue photo to enlarge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredReports.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50 text-blue-900 text-base">
                      <TableHead className="py-3 px-4">Image</TableHead>
                      <TableHead className="py-3 px-4">Details</TableHead>
                      <TableHead className="py-3 px-4">Location</TableHead>
                      <TableHead className="py-3 px-4">Reporter</TableHead>
                      <TableHead className="py-3 px-4">Date</TableHead>
                      <TableHead className="py-3 px-4">Status</TableHead>
                      <TableHead className="py-3 px-4">Priority</TableHead>
                      <TableHead className="py-3 px-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map(report => (
                      <TableRow key={report._id} className="hover:bg-blue-50">
                        {/* Image */}
                        <TableCell className="py-3 px-4">
                          {report.imageUrl ? (
                            <div className="relative w-16 h-16 cursor-pointer"
                              style={{ margin: "0 auto" }}
                              onClick={() => setSelectedImage(report.imageUrl!)}
                            >
                              <img
                                src={report.imageUrl}
                                alt="Report"
                                className="w-full h-full object-cover border border-blue-200 rounded hover:opacity-80 transition"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition bg-black bg-opacity-50 rounded">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 border border-blue-100 rounded flex items-center justify-center m-auto">
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        {/* Details cell */}
                        <TableCell className="py-3 px-4 align-top">
                          <div>
                            <div className="font-semibold text-blue-900">{report.title || report.category}</div>
                            <div className="text-xs text-blue-700">{report.category}</div>
                            <div className="text-xs text-blue-800 mb-1">{report.description}</div>
                            {report.severity && (
                              <div className="text-xs text-blue-700">Severity: Level {report.severity}</div>
                            )}
                            {report.afterImageUrl && (
                              <div className="mt-2">
                                <span className="text-xs text-green-700 font-semibold">After (Resolved):</span>
                                <img
                                  src={report.afterImageUrl}
                                  alt="After"
                                  className="w-16 h-16 object-cover rounded border border-green-200 mt-1"
                                  onClick={() => setSelectedImage(report.afterImageUrl!)}
                                  style={{ cursor: "pointer" }}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {/* Location */}
                        <TableCell className="py-3 px-4 align-top">
                          <div>
                            <div className="flex items-center gap-1 text-xs text-blue-800">
                              <MapPin className="w-3 h-3" />
                              {report.address}
                            </div>
                            {report.location?.coordinates && (
                              <div className="text-xs text-blue-600 mt-1">
                                {report.location.coordinates[1].toFixed(4)}, {report.location.coordinates[0].toFixed(4)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {/* Reporter */}
                        <TableCell className="py-3 px-4 align-top">
                          <div className="text-xs text-blue-900 font-medium">{report.user.email}</div>
                          {report.user.phone && (
                            <div className="text-xs text-blue-700">{report.user.phone}</div>
                          )}
                        </TableCell>
                        {/* Date */}
                        <TableCell className="py-3 px-4 align-top">
                          <div className="flex items-center gap-1 text-xs text-blue-900">
                            <Calendar className="w-3 h-3" />
                            {new Date(report.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        {/* Status */}
                        <TableCell className="py-3 px-4 align-top">
                          <Select
                            value={report.status}
                            onValueChange={value => handleStatusChange(report._id, value)}
                            disabled={isAfterImageUploading}
                          >
                            <SelectTrigger className={`w-32 h-8 bg-white border border-blue-200 rounded shadow-none text-sm font-semibold
                              ${report.status === "pending" ? "text-yellow-700" : report.status === "in-progress" ? "text-blue-700" : "text-green-700"}
                            `}>
                              <SelectValue>
                                {report.status === "pending"
                                  ? "Pending"
                                  : report.status === "in-progress"
                                    ? "In Progress"
                                    : "Resolved"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                <span className="text-yellow-700 font-semibold">Pending</span>
                              </SelectItem>
                              <SelectItem value="in-progress">
                                <span className="text-blue-700 font-semibold">In Progress</span>
                              </SelectItem>
                              <SelectItem value="resolved">
                                <span className="text-green-700 font-semibold">Resolved</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {/* Priority */}
                        <TableCell className="py-3 px-4 align-top">
                          {report.priority && (
                            <Badge variant={getPriorityColor(report.priority) as any} className="text-xs">
                              {report.priority}
                            </Badge>
                          )}
                        </TableCell>
                        {/* Actions */}
                        <TableCell className="py-3 px-4 align-top">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" disabled={isAfterImageUploading}><Eye className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" disabled={isAfterImageUploading}><Edit className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-blue-200 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-blue-900">No Reports Found</h3>
                <p className="text-blue-700">
                  {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                    ? "Try adjusting your filters or search query."
                    : "Reports will appear here once users submit them."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal for uploading after image */}
        {showAfterImageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
              <h2 className="text-lg font-bold mb-2 text-blue-900">Upload After Image (required to resolve)</h2>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={e => setAfterImageFile(e.target.files?.[0] || null)}
                disabled={isAfterImageUploading}
              />
              {afterImageFile && (
                <img src={URL.createObjectURL(afterImageFile)} className="mt-4 rounded w-full max-h-60 object-contain border" alt="Preview" />
              )}
              <div className="flex gap-4 mt-4">
                <Button onClick={onAfterImageSubmit} disabled={!afterImageFile || isAfterImageUploading}>
                  Upload and Resolve
                </Button>
                <Button variant="outline" onClick={onAfterImageCancel} disabled={isAfterImageUploading}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-2xl max-h-[80vh] bg-white rounded-lg shadow-lg">
              <img
                src={selectedImage}
                alt="Issue photo"
                className="max-w-full max-h-[75vh] rounded mb-2"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setSelectedImage(null)}
              >
                ×
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// StatCard helper
function StatCard({ icon, value, label, border, color = "" }: { icon: React.ReactNode, value: string | number, label: string, border?: string, color?: string }) {
  return (
    <div className={`bg-white rounded shadow flex flex-col items-center py-9 border ${border ? border : "border-blue-100"}`}>
      <div className={color}>{icon}</div>
      <span className={`text-2xl font-bold ${color ? color : "text-blue-900"}`}>{value}</span>
      <span className={`text-xs ${color ? color : "text-blue-700"} mt-1`}>{label}</span>
    </div>
  );
}
