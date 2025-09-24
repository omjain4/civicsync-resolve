import { useState, useRef, ReactNode } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin, Calendar, AlertCircle, CheckCircle, Clock, Replace, Trash2, Loader2, X,
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

const fetchUserReports = async () => {
  const { data } = await api.get('/reports/my-reports');
  return data.data;
};

export default function MyIssues() {
  const [reportToUpdate, setReportToUpdate] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ action: () => void; title: string; desc: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: issues, isLoading, error } = useQuery({
    queryKey: ['myIssues'],
    queryFn: fetchUserReports
  });

  const mutationOptions = (successMessage: string) => ({
    onSuccess: () => {
      toast({ title: "Success", description: successMessage });
      queryClient.invalidateQueries({ queryKey: ['myIssues'] });
      setConfirmState(null);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Operation Failed", description: err.response?.data?.message || "An unexpected error occurred." });
      setConfirmState(null);
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: (reportId: string) => api.delete(`/reports/${reportId}/image`),
    ...mutationOptions("Your report image has been removed."),
  });

  const replaceImageMutation = useMutation({
    mutationFn: ({ reportId, photo }: { reportId: string, photo: File }) => {
      const formData = new FormData();
      formData.append('photo', photo);
      return api.put(`/reports/${reportId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    ...mutationOptions("Your report has been updated with the new image."),
  });
  
  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => api.delete(`/reports/${reportId}`),
    ...mutationOptions("Your report has been successfully withdrawn."),
  });

  const handleReplaceClick = (reportId: string) => {
    setReportToUpdate(reportId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && reportToUpdate) {
      replaceImageMutation.mutate({ reportId: reportToUpdate, photo: file });
    }
    event.target.value = '';
    setReportToUpdate(null);
  };

  const handleDeleteImageClick = (reportId: string) => {
    setConfirmState({
      action: () => deleteImageMutation.mutate(reportId),
      title: "Delete Image?",
      desc: "Are you sure you want to permanently delete your report image?"
    });
  };
  
  const handleDeleteReportClick = (reportId: string) => {
    setConfirmState({
      action: () => deleteReportMutation.mutate(reportId),
      title: "Delete Report?",
      desc: "Are you sure you want to withdraw and permanently delete this report?"
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':      return 'warning';
      case 'in-progress':  return 'default';
      case 'resolved':     return 'success';
      default:             return 'secondary';
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }
  
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-center"><AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" /><h2 className="text-2xl font-bold">Failed to load issues</h2></div>;
  }

  const renderIssues = (filterStatus?: string) => {
    const filteredIssues = filterStatus ? issues?.filter((issue: any) => issue.status === filterStatus) : issues;
    if (!filteredIssues || filteredIssues.length === 0) return <div className="text-center py-10"><h3 className="text-lg font-semibold">No issues found here.</h3></div>;

    return (
      <div className="grid gap-6">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        {filteredIssues.map((issue: any) => (
          <Card key={issue._id} className="shadow-sm">
            <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle>{issue.title || issue.category}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2"><MapPin className="w-4 h-4"/>{issue.address}</CardDescription>
                  </div>
                    <Badge variant={getStatusColor(issue.status) as any} className="capitalize">{issue.status.replace('-', ' ')}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{issue.description}</p>
              <div className="flex flex-wrap gap-4">
                  {issue.imageUrl && (
                    <div>
                      <p className="font-semibold text-xs mb-1">Before</p>
                      <img src={issue.imageUrl} alt="Before" className="w-40 h-28 object-cover rounded border cursor-pointer" onClick={() => setSelectedImage(issue.imageUrl)}/>
                      {issue.status === 'pending' && (
                         <div className="flex gap-2 mt-2">
                           <Button size="sm" variant="outline" onClick={() => handleReplaceClick(issue._id)} disabled={replaceImageMutation.isPending}><Replace className="w-4 h-4 mr-2"/>Replace</Button>
                           <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteImageClick(issue._id)} disabled={deleteImageMutation.isPending}><Trash2 className="w-4 h-4 mr-2"/>Delete</Button>
                         </div>
                      )}
                    </div>
                  )}
                  {issue.afterImageUrl && (
                     <div>
                       <p className="font-semibold text-xs mb-1 text-green-600">After (Resolved)</p>
                       <img src={issue.afterImageUrl} alt="After" className="w-40 h-28 object-cover rounded border-2 border-green-500 cursor-pointer" onClick={() => setSelectedImage(issue.afterImageUrl)}/>
                     </div>
                  )}
              </div>
              {issue.status === 'pending' && (
                  <div className="border-t pt-4">
                      <Button variant="destructive" onClick={() => handleDeleteReportClick(issue._id)} disabled={deleteReportMutation.isPending}><Trash2 className="w-4 h-4 mr-2"/>Delete Full Report</Button>
                  </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full">
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
            <img src={selectedImage} alt="Enlarged issue" className="max-w-full max-h-full object-contain rounded-lg"/>
            <Button variant="secondary" size="icon" className="absolute top-4 right-4 rounded-full" onClick={() => setSelectedImage(null)}><X className="w-5 h-5"/></Button>
          </div>
        )}
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8">My Reported Issues</h1>
            <Card>
              <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 border-b rounded-t-lg rounded-b-none p-0 h-auto"><TabsTrigger value="all" className="py-3">All</TabsTrigger><TabsTrigger value="pending" className="py-3">Pending</TabsTrigger><TabsTrigger value="in-progress" className="py-3">In Progress</TabsTrigger><TabsTrigger value="resolved" className="py-3">Resolved</TabsTrigger></TabsList>
                  <CardContent className="p-6">
                      <TabsContent value="all">{renderIssues()}</TabsContent>
                      <TabsContent value="pending">{renderIssues('pending')}</TabsContent>
                      <TabsContent value="in-progress">{renderIssues('in-progress')}</TabsContent>
                      <TabsContent value="resolved">{renderIssues('resolved')}</TabsContent>
                  </CardContent>
              </Tabs>
            </Card>
        </div>
    </div>
  );
}