import { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Loader2, GripVertical } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    DndContext,
    DragOverlay,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    useSensor,
    useSensors,
    PointerSensor,
    useDroppable,
    rectIntersection,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// --- TYPE ---
interface Report {
    _id: string;
    category: string;
    address: string;
    priority: 'low' | 'medium' | 'high';
    imageUrl?: string;
    assignedDepartment: string;
}

// --- DRAGGABLE CARD (uses useDraggable, NOT useSortable) ---
function DraggableCard({ report }: { report: Report }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: report._id,
        data: { report },
    });

    const style = transform
        ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:border-[#D52E25]/30 transition-colors ${isDragging ? 'opacity-30' : ''}`}
            {...listeners}
            {...attributes}
        >
            {report.imageUrl && (
                <img src={report.imageUrl} alt={report.category} className="w-full h-24 object-cover mb-2" />
            )}
            <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 px-2 py-0.5 truncate">
                    {report.category}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 flex-shrink-0">
                    {report.priority === 'high' ? (
                        <ArrowUp className="w-3 h-3 text-[#D52E25]" />
                    ) : (
                        <ArrowDown className="w-3 h-3 text-amber-500" />
                    )}
                    <span className="capitalize">{report.priority}</span>
                </div>
            </div>
            <p className="font-semibold text-xs mt-2 leading-tight truncate">{report.address}</p>
        </div>
    );
}

// --- STATIC OVERLAY CARD (no drag hooks, just visual) ---
function OverlayCard({ report }: { report: Report }) {
    return (
        <div className="bg-white border-2 border-[#D52E25] p-3 shadow-xl rotate-2 w-[200px]">
            {report.imageUrl && (
                <img src={report.imageUrl} alt={report.category} className="w-full h-24 object-cover mb-2" />
            )}
            <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 px-2 py-0.5 truncate">
                    {report.category}
                </span>
            </div>
            <p className="font-semibold text-xs mt-2 leading-tight truncate">{report.address}</p>
        </div>
    );
}

// --- DROPPABLE COLUMN (uses useDroppable) ---
function DroppableColumn({
    id,
    title,
    reports,
    isOver,
}: {
    id: string;
    title: string;
    reports: Report[];
    isOver: boolean;
}) {
    const { setNodeRef, isOver: isDirectlyOver } = useDroppable({ id });
    const highlighted = isOver || isDirectlyOver;

    return (
        <div
            ref={setNodeRef}
            className={`bg-gray-50 border p-3 w-full transition-all min-h-[350px] ${highlighted
                    ? 'bg-[#D52E25]/5 border-[#D52E25] border-2 shadow-inner'
                    : 'border-gray-200'
                }`}
        >
            <div className="flex items-center gap-2 mb-4 px-1">
                <h3 className="font-bold text-xs uppercase tracking-widest truncate">{title}</h3>
                <span className="text-[10px] font-bold bg-[#1C1C1C] text-white px-2 py-0.5 flex-shrink-0">
                    {reports.length}
                </span>
            </div>

            <div className="space-y-2">
                {reports.map((report) => (
                    <DraggableCard key={report._id} report={report} />
                ))}
            </div>

            {/* Always-visible drop zone at the bottom */}
            <div
                className={`mt-2 border-2 border-dashed flex items-center justify-center h-16 text-[10px] uppercase tracking-widest font-semibold transition-all ${highlighted
                        ? 'border-[#D52E25] bg-[#D52E25]/10 text-[#D52E25]'
                        : 'border-gray-300 text-gray-400'
                    }`}
            >
                {highlighted ? '← Drop here →' : reports.length === 0 ? 'Drop issues here' : '+ Drop more'}
            </div>
        </div>
    );
}

export default function AssignmentBoard() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [reportColumns, setReportColumns] = useState<Record<string, Report[]>>({});
    const [activeReport, setActiveReport] = useState<Report | null>(null);
    const [overColumnId, setOverColumnId] = useState<string | null>(null);

    const { data: reports = [], isLoading } = useQuery<Report[]>({
        queryKey: ['allReports'],
        queryFn: async () => (await api.get('/reports')).data.data,
    });

    const departmentList = useMemo(
        () => ['Unassigned', 'Public Works', 'Sanitation', 'Transportation', 'Parks & Recreation', 'Water Dept.'],
        []
    );

    useEffect(() => {
        const columns: Record<string, Report[]> = Object.fromEntries(
            departmentList.map((dept) => [dept, []])
        );
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
        mutationFn: ({ reportId, department }: { reportId: string; department: string }) =>
            api.put(`/reports/${reportId}/assign`, { department }),
        onSuccess: () => {
            toast({ title: 'Success', description: 'Issue has been reassigned.' });
            queryClient.invalidateQueries({ queryKey: ['allReports'] });
        },
        onError: () => {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to reassign issue.' });
            queryClient.invalidateQueries({ queryKey: ['allReports'] });
        },
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    // Find which column contains a given reportId
    const findContainerOfReport = useCallback((reportId: string): string | undefined => {
        return Object.keys(reportColumns).find((dept) =>
            reportColumns[dept].some((r) => r._id === reportId)
        );
    }, [reportColumns]);

    const handleDragStart = (event: DragStartEvent) => {
        const report = event.active.data?.current?.report as Report | undefined;
        if (report) {
            setActiveReport(report);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (!over) {
            setOverColumnId(null);
            return;
        }
        const overId = over.id.toString();
        // If over is directly a column
        if (departmentList.includes(overId)) {
            setOverColumnId(overId);
        } else {
            // Over is a report card inside a column — find which column
            const container = findContainerOfReport(overId);
            setOverColumnId(container || null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveReport(null);
        setOverColumnId(null);

        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();

        // Find source column
        const sourceColumn = findContainerOfReport(activeId);
        if (!sourceColumn) return;

        // Find destination column
        let destColumn: string | undefined;
        if (departmentList.includes(overId)) {
            // Dropped directly on a column
            destColumn = overId;
        } else {
            // Dropped on a report inside a column
            destColumn = findContainerOfReport(overId);
        }

        if (!destColumn || sourceColumn === destColumn) return;

        // Optimistic UI update
        setReportColumns((prev) => {
            const newColumns = { ...prev };
            const sourceItems = [...(newColumns[sourceColumn] || [])];
            const destItems = [...(newColumns[destColumn!] || [])];

            const activeIndex = sourceItems.findIndex((r) => r._id === activeId);
            if (activeIndex === -1) return prev;

            const [movedReport] = sourceItems.splice(activeIndex, 1);
            destItems.push({ ...movedReport, assignedDepartment: destColumn! });

            newColumns[sourceColumn] = sourceItems;
            newColumns[destColumn!] = destItems;

            return newColumns;
        });

        // Trigger backend mutation
        assignMutation.mutate({ reportId: activeId, department: destColumn });
    };

    const handleDragCancel = () => {
        setActiveReport(null);
        setOverColumnId(null);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D52E25] mb-3" />
                    <p className="text-xs uppercase tracking-widest text-gray-400">Loading board...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-page-in">
            <div>
                <p className="section-label mb-2">Administration</p>
                <h1 className="display-md mb-1">Assignment Board</h1>
                <p className="text-xs uppercase tracking-wider text-gray-400">
                    Drag and drop issues to assign them to the correct department.
                </p>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
                    {departmentList.map((department) => (
                        <DroppableColumn
                            key={department}
                            id={department}
                            title={department}
                            reports={reportColumns[department] || []}
                            isOver={overColumnId === department}
                        />
                    ))}
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeReport ? <OverlayCard report={activeReport} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}