import { useState, useRef } from "react";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye, MapPin, Calendar, AlertCircle, CheckCircle, Clock, Replace, Trash2, Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import api from "../lib/api";

const fetchUserReports = async () => {
  const { data } = await api.get('/reports/my-reports');
  return data.data;
};

export default function MyIssues() {
  const [reportToUpdate, setReportToUpdate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: issues, isLoading, error } = useQuery({
    queryKey: ['myIssues'],
    queryFn: fetchUserReports
  });

  const deleteImageMutation = useMutation({
    mutationFn: (reportId: string) => api.delete(`/reports/${reportId}/image`),
    onSuccess: () => {
      toast({ title: "Image Deleted", description: "Your report image has been removed." });
      queryClient.invalidateQueries({ queryKey: ['myIssues'] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Deletion Failed", description: err.response?.data?.message });
    }
  });

  const replaceImageMutation = useMutation({
    mutationFn: ({ reportId, photo }: { reportId: string, photo: File }) => {
      const formData = new FormData();
      formData.append('photo', photo);
      return api.put(`/reports/${reportId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast({ title: "Image Replaced", description: "Your report has been updated with the new image." });
      queryClient.invalidateQueries({ queryKey: ['myIssues'] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Replacement Failed", description: err.response?.data?.message });
    }
  });
  
  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => api.delete(`/reports/${reportId}`),
    onSuccess: () => {
        toast({ title: "Report Deleted", description: "Your report has been successfully withdrawn." });
        queryClient.invalidateQueries({ queryKey: ["myIssues"] });
    },
    onError: (err: any) => {
        toast({ variant: "destructive", title: "Deletion Failed", description: err.response?.data?.message || "Could not delete report." });
    },
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
    if (window.confirm("Are you sure you want to delete this image?")) {
      deleteImageMutation.mutate(reportId);
    }
  };
  
  const handleDeleteReportClick = (reportId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this report?")) {
      deleteReportMutation.mutate(reportId);
    }
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }
  
  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center text-center">
            <div>
                <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Failed to load issues</h2>
            </div>
        </div>
    );
  }

  const renderIssues = (filterStatus?: string) => {
    const filteredIssues = filterStatus
      ? issues?.filter((issue: any) => issue.status === filterStatus)
      : issues;

    if (!filteredIssues || filteredIssues.length === 0) {
      return (
        <div className="text-center py-10">
          <h3 className="text-lg font-semibold">No issues found for this category</h3>
        </div>
      );
    }

    return (
      <div className="grid gap-5">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        {filteredIssues.map((issue: any) => (
          <Card key={issue._id} className="shadow-civic">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>{issue.title || issue.category}</CardTitle>
                    <Badge variant={getStatusColor(issue.status) as any}>{issue.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">{issue.address}</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{issue.description}</p>
                <div className="flex gap-4">
                    {issue.imageUrl && (
                      <div>
                        <p className="font-semibold text-xs mb-1">Before</p>
                        <img src={issue.imageUrl} alt="Before" className="w-36 h-24 object-cover rounded border"/>
                        {issue.status === 'pending' && (
                           <div className="flex gap-2 mt-2">
                             <Button size="sm" variant="outline" onClick={() => handleReplaceClick(issue._id)} disabled={replaceImageMutation.isPending}>
                               {replaceImageMutation.isPending && reportToUpdate === issue._id ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <Replace className="w-4 h-4 mr-1"/>}
                               Replace
                             </Button>
                             <Button size="sm" variant="destructive" onClick={() => handleDeleteImageClick(issue._id)} disabled={deleteImageMutation.isPending}>
                               {deleteImageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : <Trash2 className="w-4 h-4 mr-1"/>}
                               Delete
                             </Button>
                           </div>
                        )}
                      </div>
                    )}
                    {issue.afterImageUrl && (
                       <div>
                         <p className="font-semibold text-xs mb-1">After (Resolved)</p>
                         <img src={issue.afterImageUrl} alt="After" className="w-36 h-24 object-cover rounded border"/>
                       </div>
                    )}
                </div>
                {issue.status === 'pending' && (
                    <div className="border-t pt-4">
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteReportClick(issue._id)}
                            disabled={deleteReportMutation.isPending && deleteReportMutation.variables === issue._id}
                        >
                            {deleteReportMutation.isPending && deleteReportMutation.variables === issue._id
                                ? <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                                : <Trash2 className="w-4 h-4 mr-2"/>
                            }
                            Delete Full Report
                        </Button>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 w-full">
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8">My Issues</h1>
            <Card>
                <CardContent className="p-0">
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="pending">Pending</TabsTrigger>
                            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                            <TabsTrigger value="resolved">Resolved</TabsTrigger>
                        </TabsList>
                        <div className="p-6">
                            <TabsContent value="all">{renderIssues()}</TabsContent>
                            <TabsContent value="pending">{renderIssues('pending')}</TabsContent>
                            <TabsContent value="in-progress">{renderIssues('in-progress')}</TabsContent>
                            <TabsContent value="resolved">{renderIssues('resolved')}</TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}