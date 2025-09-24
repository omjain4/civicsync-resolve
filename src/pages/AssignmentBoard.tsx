import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// --- TYPE DEFINITION ---
interface Report {
  _id: string;
  category: string;
  address: string;
  priority: 'low' | 'medium' | 'high';
  imageUrl?: string;
  assignedDepartment: string;
}

// --- DRAGGABLE REPORT CARD COMPONENT ---
const ReportCard = ({ report }: { report: Report }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: report._id, data: { type: 'ITEM', report } });
    const style = { 
        transform: CSS.Transform.toString(transform), 
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Card ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shadow-sm">
            <CardContent className="p-3 space-y-2">
                {report.imageUrl && <img src={report.imageUrl} alt={report.category} className="w-full h-28 object-cover rounded-md"/>}
                <div className="flex justify-between items-start">
                    <Badge variant="secondary">{report.category}</Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {report.priority === 'high' ? <ArrowUp className="w-4 h-4 text-red-500"/> : <ArrowDown className="w-4 h-4 text-yellow-500"/>}
                        <span className="capitalize">{report.priority}</span>
                    </div>
                </div>
                <p className="font-semibold text-sm leading-tight">{report.address}</p>
            </CardContent>
        </Card>
    );
}

// --- DROPPABLE COLUMN COMPONENT ---
const DepartmentColumn = ({ title, reports }: { title: string, reports: Report[] }) => {
    const { setNodeRef } = useSortable({ id: title, data: { type: 'COLUMN' } });
    return (
        <div ref={setNodeRef} className="bg-slate-100 rounded-lg p-3 w-full h-full">
            <h3 className="font-semibold mb-4 flex items-center gap-2 px-1">
                {title}
                <Badge variant="secondary" className="rounded-full">{reports.length}</Badge>
            </h3>
            <SortableContext items={reports.map(r => r._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 min-h-[200px]">
                    {reports.map(report => <ReportCard key={report._id} report={report} />)}
                    {reports.length === 0 && (
                        <div className="border-2 border-dashed rounded-lg flex items-center justify-center h-24 text-sm text-muted-foreground">
                            Drop issues here.
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    );
}

export default function AssignmentBoard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reportColumns, setReportColumns] = useState<Record<string, Report[]>>({});

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['allReports'],
    queryFn: async () => (await api.get('/reports')).data.data,
  });

  const departmentList = useMemo(() => [
    'Unassigned', 'Public Works', 'Sanitation', 'Transportation', 'Parks & Recreation', 'Water Dept.'
  ], []);

  useEffect(() => {
    const columns = Object.fromEntries(departmentList.map(dept => [dept, []]));
    reports.forEach((report) => {
        const dept = report.assignedDepartment || 'Unassigned';
        if (columns[dept]) {
            columns[dept].push(report);
        } else {
            columns['Unassigned'].push(report);
        }
    });
    setReportColumns(columns);
  }, [reports, departmentList]);

  const assignMutation = useMutation({
    mutationFn: ({ reportId, department }: { reportId: string, department: string }) => 
        api.put(`/reports/${reportId}/assign`, { department }),
    onSuccess: () => {
        toast({ title: "Success", description: "Issue has been reassigned." });
        queryClient.invalidateQueries({ queryKey: ['allReports'] });
    },
    onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Failed to reassign issue." });
        queryClient.invalidateQueries({ queryKey: ['allReports'] });
    }
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Find the containers for the active and over items
    const activeContainer = Object.keys(reportColumns).find(dept => reportColumns[dept].some(r => r._id === activeId));
    let overContainer = Object.keys(reportColumns).find(dept => reportColumns[dept].some(r => r._id === overId));

    // If `over` is a column itself, `overContainer` will be undefined, so we use `overId`
    if (!overContainer && departmentList.includes(overId)) {
        overContainer = overId;
    }

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }
    
    // Trigger backend mutation
    assignMutation.mutate({ reportId: activeId, department: overContainer });

    // Optimistic UI update
    setReportColumns(prev => {
      const newColumns = { ...prev };
      const activeReportIndex = newColumns[activeContainer].findIndex(r => r._id === activeId);
      const [activeReport] = newColumns[activeContainer].splice(activeReportIndex, 1);
      
      // This check prevents the "not iterable" error
      if (!newColumns[overContainer!]) {
        newColumns[overContainer!] = [];
      }
      newColumns[overContainer!].push({ ...activeReport, assignedDepartment: overContainer! });
      
      return newColumns;
    });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="w-8 h-8 animate-spin"/></div>
  }

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold">Issue Assignment Board</h1>
            <p className="text-muted-foreground">Drag and drop issues to assign them to the correct department.</p>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={departmentList}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 items-start">
                    {departmentList.map(department => (
                        <DepartmentColumn key={department} title={department} reports={reportColumns[department] || []} />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    </div>
  )
}