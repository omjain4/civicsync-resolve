import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye, MapPin, Calendar, AlertCircle, CheckCircle, Clock, Image as ImageIcon
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

const fetchUserReports = async () => {
  const { data } = await api.get('/reports/my-reports');
  return data.data;
};

export default function MyIssues() {
  const { data: issues, isLoading, error } = useQuery({
    queryKey: ['myIssues'],
    queryFn: fetchUserReports
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':      return 'warning';
      case 'in-progress':  return 'default';
      case 'resolved':     return 'success';
      default:             return 'secondary';
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':     return <Clock className="w-4 h-4" />;
      case 'in-progress': return <AlertCircle className="w-4 h-4" />;
      case 'resolved':    return <CheckCircle className="w-4 h-4" />;
      default:            return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="mt-4 text-muted-foreground">Loading your issues...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Failed to load issues</h2>
          <p className="text-muted-foreground">Please try again later.</p>
        </div>
      </div>
    );
  }

  const pendingCount    = issues?.filter(issue => issue.status === 'pending').length || 0;
  const inProgressCount = issues?.filter(issue => issue.status === 'in-progress').length || 0;
  const resolvedCount   = issues?.filter(issue => issue.status === 'resolved').length || 0;

  const renderIssues = (filterStatus?: string) => {
    const filteredIssues = filterStatus
      ? issues?.filter(issue => issue.status === filterStatus)
      : issues;

    if (!filteredIssues || filteredIssues.length === 0) {
      return (
        <div className="text-center py-10">
          <AlertCircle className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No issues found for this category</h3>
          <p className="text-muted-foreground">Your reported issues will appear here once submitted.</p>
        </div>
      );
    }

    return (
      <div className="grid gap-5">
        {filteredIssues.map((issue) => (
          <Card key={issue._id} className="shadow-civic">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <div className="space-y-2">
                  <CardTitle className="text-base md:text-lg">{issue.title || issue.category}</CardTitle>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {issue.address}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getStatusColor(issue.status) as any} className="flex items-center gap-1">
                    {getStatusIcon(issue.status)}
                    <span className="hidden sm:inline">
                      {issue.status.replace('-', ' ')}
                    </span>
                    <span className="sm:hidden capitalize">{issue.status[0]}</span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-xs md:text-sm text-muted-foreground">{issue.description}</p>
                {/* BEFORE & AFTER images stacked on mobile, side-by-side on larger screens */}
                {(issue.imageUrl || issue.afterImageUrl) && (
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mt-2">
                    {issue.imageUrl && (
                      <div className="w-full sm:w-auto text-center sm:text-left">
                        <div className="font-semibold text-xs mb-1">Before</div>
                        <img
                          src={issue.imageUrl}
                          alt="Before"
                          className="w-full max-w-xs sm:w-36 sm:h-24 object-cover rounded border shadow-sm mb-2 cursor-pointer"
                          onClick={() => window.open(issue.imageUrl, '_blank')}
                        />
                      </div>
                    )}
                    {issue.afterImageUrl && (
                      <div className="w-full sm:w-auto text-center sm:text-left">
                        <div className="font-semibold text-xs mb-1">After</div>
                        <img
                          src={issue.afterImageUrl}
                          alt="After"
                          className="w-full max-w-xs sm:w-36 sm:h-24 object-cover rounded border shadow-sm mb-2 cursor-pointer"
                          onClick={() => window.open(issue.afterImageUrl, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span>Category: {issue.category}</span>
                    {issue.severity && <span>Severity: Level {issue.severity}</span>}
                  </div>
                  <Button variant="outline" size="sm" className="mt-2 sm:mt-0">
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 w-full">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-5 sm:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-3">My Issues</h1>
          <p className="text-sm sm:text-lg text-muted-foreground">
            Track the status and progress of your reported civic issues
          </p>
        </div>

        {/* Stats Cards - collapse to two cols or 1 on mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card className="shadow-civic">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg md:text-2xl font-bold">{pendingCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                </div>
                <Clock className="w-6 h-6 md:w-8 md:h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-civic">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg md:text-2xl font-bold">{inProgressCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">In Progress</p>
                </div>
                <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-civic">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg md:text-2xl font-bold">{resolvedCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Resolved</p>
                </div>
                <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-civic">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg md:text-2xl font-bold">{issues?.length || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Reports</p>
                </div>
                <Eye className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issues List with Tabs */}
        <Card className="shadow-civic-strong">
          <CardContent className="p-0">
            <Tabs defaultValue="all" className="w-full">
              <div className="px-1 sm:px-6 pt-4 sm:pt-6">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full mb-2 sm:mb-0">
                  <TabsTrigger value="all">All Issues</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved</TabsTrigger>
                </TabsList>
              </div>
              <div className="p-3 sm:p-6">
                <TabsContent value="all">
                  {renderIssues()}
                </TabsContent>
                <TabsContent value="pending">
                  {renderIssues('pending')}
                </TabsContent>
                <TabsContent value="in-progress">
                  {renderIssues('in-progress')}
                </TabsContent>
                <TabsContent value="resolved">
                  {renderIssues('resolved')}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
  