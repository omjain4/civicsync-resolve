import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, CheckCircle, Clock, AlertTriangle, FileText, Loader2, MapPin, MoreHorizontal, Building, Wrench, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import api from "../lib/api";

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, description, isLoading }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; isLoading: boolean; }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
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
const statuses = [{name: 'pending', icon: Clock, label: 'Pending'}, {name: 'in-progress', icon: Wrench, label: 'In Progress'}, {name: 'resolved', icon: CheckCircle, label: 'Resolved'}];

export default function AdminDashboard() {
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [showAfterImageModal, setShowAfterImageModal] = useState(false);
  const [pendingResolve, setPendingResolve] = useState<string | null>(null);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [isAfterImageUploading, setIsAfterImageUploading] = useState(false);
  const [confirmState, setConfirmState] = useState<{ action: () => void; title: string; desc: string } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats } = useQuery({ queryKey: ["reportStats"], queryFn: fetchReportStats });
  const { data: reports, isLoading: isLoadingReports } = useQuery({ queryKey: ["allReports"], queryFn: fetchAllReports });

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

  return (
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
            <DialogDescription className="flex items-center gap-2 pt-1"><MapPin className="w-4 h-4"/>{viewingReport?.address}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            <p className="text-sm">{viewingReport?.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {viewingReport?.imageUrl && <div><h4 className="font-semibold mb-2">Before</h4><img src={viewingReport.imageUrl} className="rounded-md w-full object-cover"/></div>}
                {viewingReport?.afterImageUrl && <div><h4 className="font-semibold mb-2">After (Resolved)</h4><img src={viewingReport.afterImageUrl} className="rounded-md w-full object-cover"/></div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showAfterImageModal} onOpenChange={setShowAfterImageModal}>
        <DialogContent><DialogHeader><DialogTitle>Upload 'After' Image</DialogTitle><DialogDescription>To mark this issue as 'Resolved', you must upload a photo of the completed work.</DialogDescription></DialogHeader><div className="py-4 space-y-4"><Input type="file" accept="image/*" onChange={e => setAfterImageFile(e.target.files?.[0] || null)} />{afterImageFile && <img src={URL.createObjectURL(afterImageFile)} className="max-h-60 w-full object-contain rounded-md border"/>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowAfterImageModal(false)}>Cancel</Button><Button onClick={onAfterImageSubmit} disabled={!afterImageFile || isAfterImageUploading}>{isAfterImageUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Upload & Resolve"}</Button></div></div></DialogContent>
      </Dialog>

      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Oversee and manage all reported civic issues.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Issues</CardTitle><FileText className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.total ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle><Clock className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.pending ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">In Progress</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.inProgress ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Resolved</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{stats?.resolved ?? 0}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All Reported Issues</CardTitle></CardHeader>
        <CardContent>
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
              {isLoadingReports ? (<TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto my-8"/></TableCell></TableRow>) : (
                reports?.map((report: any) => (
                  <TableRow key={report._id}>
                    <TableCell className="font-semibold">{report.category}</TableCell>
                    <TableCell><div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0"/><span>{report.address}</span></div></TableCell>
                    <TableCell><Badge variant="outline">{report.assignedDepartment}</Badge></TableCell>
                    <TableCell><Badge className="capitalize">{report.status.replace('-', ' ')}</Badge></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4"/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingReport(report)}><Eye className="w-4 h-4 mr-2"/>View Details</DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger><Building className="w-4 h-4 mr-2"/>Assign Department</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>{departments.map(dept => (<DropdownMenuItem key={dept} onClick={() => handleAssignDepartment(report._id, dept)}>{dept}</DropdownMenuItem>))}</DropdownMenuSubContent>
                          </DropdownMenuSub>
                           <DropdownMenuSub>
                            <DropdownMenuSubTrigger><Wrench className="w-4 h-4 mr-2"/>Update Status</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>{statuses.map(s => (<DropdownMenuItem key={s.name} onClick={() => handleUpdateStatus(report._id, s.name)}><s.icon className="w-4 h-4 mr-2"/><span>{s.label}</span></DropdownMenuItem>))}</DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600" onClick={() => handleDeleteReport(report._id)}>
                            <Trash2 className="w-4 h-4 mr-2"/>Delete Issue
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}