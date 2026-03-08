import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, CheckCircle, Clock, AlertTriangle, FileText, Loader2, MapPin, MoreHorizontal, Building, Wrench, Trash2, Users, ChevronDown, ChevronUp, MessageCircle, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import api from "../lib/api";

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, description, isLoading }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; isLoading: boolean; }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md m-4">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end gap-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>{isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Confirm</Button>
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

const departments = ["Public Works", "Sanitation", "Transportation", "Parks & Recreation", "Water Dept."];
const statuses = [{ name: 'pending', icon: Clock, label: 'Pending' }, { name: 'in-progress', icon: Wrench, label: 'In Progress' }, { name: 'resolved', icon: CheckCircle, label: 'Resolved' }];

export default function AdminDashboard() {
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [showAfterImageModal, setShowAfterImageModal] = useState(false);
  const [pendingResolve, setPendingResolve] = useState<string | null>(null);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [isAfterImageUploading, setIsAfterImageUploading] = useState(false);
  const [confirmState, setConfirmState] = useState<{ action: () => void; title: string; desc: string } | null>(null);
  const [showOverlaps, setShowOverlaps] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats } = useQuery({ queryKey: ["reportStats"], queryFn: fetchReportStats });
  const { data: reports, isLoading: isLoadingReports } = useQuery({ queryKey: ["allReports"], queryFn: fetchAllReports });

  // Compute overlapping/duplicate issue groups
  const duplicateGroups = useMemo(() => {
    if (!reports || reports.length < 2) return [];
    const groups: { category: string; reports: any[] }[] = [];
    const visited = new Set<string>();

    for (let i = 0; i < reports.length; i++) {
      if (visited.has(reports[i]._id)) continue;
      const r = reports[i];
      if (!r.location?.coordinates) continue;
      const [lng, lat] = r.location.coordinates;
      const cluster = [r];

      for (let j = i + 1; j < reports.length; j++) {
        if (visited.has(reports[j]._id)) continue;
        const s = reports[j];
        if (s.category !== r.category || !s.location?.coordinates) continue;
        const [sLng, sLat] = s.location.coordinates;
        const dist = Math.sqrt((sLng - lng) ** 2 + (sLat - lat) ** 2);
        if (dist < 0.005) {
          cluster.push(s);
          visited.add(s._id);
        }
      }
      if (cluster.length > 1) {
        visited.add(r._id);
        groups.push({ category: r.category, reports: cluster });
      }
    }
    return groups;
  }, [reports]);

  const mutationOptions = (successMessage: string) => ({
    onSuccess: () => {
      toast({ title: "Success", description: successMessage });
      queryClient.invalidateQueries({ queryKey: ["allReports"] });
      queryClient.invalidateQueries({ queryKey: ["reportStats"] });
      setConfirmState(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Operation Failed", description: error.response?.data?.message });
      setConfirmState(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ reportId, payload, endpoint = '' }: { reportId: string, payload: any, endpoint?: string }) => {
      const url = endpoint ? `/reports/${reportId}/${endpoint}` : `/reports/${reportId}`;
      const headers = payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : {};
      return api.put(url, payload, { headers });
    },
    ...mutationOptions("Report updated successfully."),
  });

  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => api.delete(`/reports/${reportId}`),
    ...mutationOptions("The report has been permanently deleted."),
  });

  const handleAssignDepartment = (reportId: string, department: string) => {
    updateMutation.mutate({ reportId, payload: { department }, endpoint: 'assign' });
  };

  const handleUpdateStatus = (reportId: string, status: string) => {
    const report = reports.find((r: any) => r._id === reportId);
    if (status === 'resolved' && !report?.afterImageUrl) {
      setPendingResolve(reportId);
      setShowAfterImageModal(true);
    } else {
      updateMutation.mutate({ reportId, payload: { status } });
    }
  };

  const handleDeleteReport = (reportId: string) => {
    setConfirmState({
      action: () => deleteReportMutation.mutate(reportId),
      title: "Delete Report Permanently?",
      desc: "This will permanently delete the entire report, including all its data and images. This action cannot be undone."
    });
  };

  const onAfterImageSubmit = async () => {
    if (!pendingResolve || !afterImageFile) return toast({ variant: "destructive", title: "File Required" });

    setIsAfterImageUploading(true);
    const formData = new FormData();
    formData.append('status', 'resolved');
    formData.append('afterImage', afterImageFile);

    await updateMutation.mutateAsync({ reportId: pendingResolve, payload: formData });

    setIsAfterImageUploading(false);
    setShowAfterImageModal(false);
    setPendingResolve(null);
    setAfterImageFile(null);
  };

  const handleAddComment = async () => {
    if (!viewingReport || !commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await api.post(`/reports/${viewingReport._id}/comment`, { text: commentText.trim() });
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["allReports"] });
      // Refetch the report to update comments
      const { data } = await api.get(`/reports/${viewingReport._id}`);
      setViewingReport(data.data);
      toast({ title: "Comment added" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed", description: error.response?.data?.message });
    }
    setIsSubmittingComment(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 animate-page-in">
      <div className="space-y-6">
        <ConfirmationDialog
          isOpen={!!confirmState}
          onClose={() => setConfirmState(null)}
          onConfirm={() => confirmState?.action()}
          title={confirmState?.title || ""}
          description={confirmState?.desc || ""}
          isLoading={deleteReportMutation.isPending}
        />
        <Dialog open={!!viewingReport} onOpenChange={(isOpen) => !isOpen && setViewingReport(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingReport?.category}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 pt-1"><MapPin className="w-4 h-4" />{viewingReport?.address}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              <p className="text-sm">{viewingReport?.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {viewingReport?.imageUrl && <div><h4 className="font-semibold mb-2">Before</h4><img src={viewingReport.imageUrl} className="rounded-md w-full object-cover" /></div>}
                {viewingReport?.afterImageUrl && <div><h4 className="font-semibold mb-2">After (Resolved)</h4><img src={viewingReport.afterImageUrl} className="rounded-md w-full object-cover" /></div>}
              </div>
              {/* Comments Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-widest">Comments ({viewingReport?.comments?.length || 0})</h4>
                </div>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                  />
                  <Button size="icon" onClick={handleAddComment} disabled={isSubmittingComment || !commentText.trim()}>
                    {isSubmittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {(viewingReport?.comments || []).slice().reverse().map((c: any, i: number) => (
                    <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-md">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(c.user?.username || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{c.user?.username || 'User'}</span>
                          <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm mt-1">{c.text}</p>
                      </div>
                    </div>
                  ))}
                  {(!viewingReport?.comments || viewingReport.comments.length === 0) && (
                    <p className="text-center text-sm text-gray-400 py-4">No comments yet</p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAfterImageModal} onOpenChange={setShowAfterImageModal}>
          <DialogContent><DialogHeader><DialogTitle>Upload 'After' Image</DialogTitle><DialogDescription>To mark this issue as 'Resolved', you must upload a photo of the completed work.</DialogDescription></DialogHeader><div className="py-4 space-y-4"><Input type="file" accept="image/*" onChange={e => setAfterImageFile(e.target.files?.[0] || null)} />{afterImageFile && <img src={URL.createObjectURL(afterImageFile)} className="max-h-60 w-full object-contain rounded-md border" />}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowAfterImageModal(false)}>Cancel</Button><Button onClick={onAfterImageSubmit} disabled={!afterImageFile || isAfterImageUploading}>{isAfterImageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload & Resolve"}</Button></div></div></DialogContent>
        </Dialog>

        <div>
          <p className="section-label mb-2">Administration</p>
          <h1 className="display-md mb-1">Dashboard</h1>
          <p className="text-xs uppercase tracking-wider text-gray-400">Oversee and manage all reported civic issues.</p>
        </div>

        <div className="grid gap-0 grid-cols-2 lg:grid-cols-4 border border-gray-200 bg-white">
          <div className="p-5 border-r border-b lg:border-b-0 border-gray-200"><div className="flex items-center justify-between mb-3"><span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Total Issues</span><FileText className="h-5 w-5 text-gray-400" /></div><div className="text-3xl font-extrabold text-gray-900">{stats?.total ?? 0}</div></div>
          <div className="p-5 border-r-0 lg:border-r border-b lg:border-b-0 border-gray-200"><div className="flex items-center justify-between mb-3"><span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Pending</span><Clock className="h-4 w-4 text-amber-500" /></div><div className="text-3xl font-extrabold text-amber-500">{stats?.pending ?? 0}</div></div>
          <div className="p-5 border-r border-gray-200"><div className="flex items-center justify-between mb-3"><span className="text-xs font-semibold uppercase tracking-widest text-gray-500">In Progress</span><AlertTriangle className="h-4 w-4 text-blue-500" /></div><div className="text-3xl font-extrabold text-blue-500">{stats?.inProgress ?? 0}</div></div>
          <div className="p-5"><div className="flex items-center justify-between mb-3"><span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Resolved</span><CheckCircle className="h-4 w-4 text-emerald-500" /></div><div className="text-3xl font-extrabold text-emerald-500">{stats?.resolved ?? 0}</div></div>
        </div>

        {/* Overlap / Duplicate Issues Section */}
        {duplicateGroups.length > 0 && (
          <div className="bg-white border border-amber-300">
            <button
              onClick={() => setShowOverlaps(!showOverlaps)}
              className="w-full flex items-center justify-between p-4 border-b border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-amber-800">
                  Overlapping Issues Detected ({duplicateGroups.length} {duplicateGroups.length === 1 ? 'group' : 'groups'})
                </h2>
              </div>
              {showOverlaps ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
            </button>
            {showOverlaps && (
              <div className="divide-y divide-amber-200">
                {duplicateGroups.map((group, idx) => (
                  <div key={idx} className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-3">
                      {group.category} — {group.reports.length} similar reports nearby
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.reports.map((r: any) => (
                        <div key={r._id} className="flex items-center gap-3 p-3 border border-amber-200 bg-amber-50/30 hover:bg-amber-50 transition-colors">
                          {r.imageUrl ? (
                            <img src={r.imageUrl} alt="" className="w-10 h-10 object-cover flex-shrink-0 border" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 flex items-center justify-center flex-shrink-0 border">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold truncate">{r.address}</p>
                            <p className="text-[9px] text-gray-400">
                              {r.user?.email || 'Unknown user'} · <Badge variant="outline" className="text-[8px] px-1 py-0">{r.status}</Badge>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">All Reported Issues</h2>
          </div>
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingReports ? (<TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto my-8" /></TableCell></TableRow>) : (
                  reports?.map((report: any) => (
                    <TableRow key={report._id}>
                      <TableCell className="font-semibold">{report.category}</TableCell>
                      <TableCell><div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" /><span>{report.address}</span></div></TableCell>
                      <TableCell><Badge variant="outline">{report.assignedDepartment}</Badge></TableCell>
                      <TableCell><Badge className="capitalize">{report.status.replace('-', ' ')}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingReport(report)}><Eye className="w-4 h-4 mr-2" />View Details</DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger><Building className="w-4 h-4 mr-2" />Assign Department</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>{departments.map(dept => (<DropdownMenuItem key={dept} onClick={() => handleAssignDepartment(report._id, dept)}>{dept}</DropdownMenuItem>))}</DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger><Wrench className="w-4 h-4 mr-2" />Update Status</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>{statuses.map(s => (<DropdownMenuItem key={s.name} onClick={() => handleUpdateStatus(report._id, s.name)}><s.icon className="w-4 h-4 mr-2" /><span>{s.label}</span></DropdownMenuItem>))}</DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600" onClick={() => handleDeleteReport(report._id)}>
                              <Trash2 className="w-4 h-4 mr-2" />Delete Issue
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}