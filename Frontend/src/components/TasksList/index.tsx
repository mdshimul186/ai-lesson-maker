import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
    Search, 
    RefreshCw, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Loader2, 
    AlertTriangle,
    ExternalLink,
    Play,
    Image,
    FileText,
    File,
    Info,
    StopCircle,
    ChevronDown,
    ChevronUp,
    Calendar,
    Filter,
    Grid3X3,
    List
} from 'lucide-react';
import { 
    getAllTasks, 
    cancelTask, 
    getQueueStatus, 
    getTaskStatus
} from '../../services/index';
import styles from './index.module.css';
import { useAccountStore } from '../../stores';
import { clearApiCachePattern } from '../../utils/apiUtils';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination';
import { Task, TaskEvent } from '../../interfaces/index';
import QuizModal from '../QuizModal';

// Types

interface QueueStatus {
    queue_length: number;
    running_tasks: number;
    pending_tasks: number;
}

// Interface for exposed methods
export interface TasksListRef {
    handleRefresh: () => void;
    setViewMode: (mode: 'table' | 'cards') => void;
    setSearchText: (text: string) => void;
    setStatusFilter: (filter: string) => void;
}

// Props interface
interface TasksListProps {
    searchText?: string;
    statusFilter?: string;
    onSearchChange?: (text: string) => void;
    onStatusFilterChange?: (filter: string) => void;
}

const TasksList = forwardRef<TasksListRef, TasksListProps>((props, ref) => {
    const { searchText: initialSearchText = '', statusFilter: initialStatusFilter = 'all' } = props;
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState(initialSearchText);
    const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
    const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
    const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
    const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

    // Auto-switch to cards view on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setViewMode('cards');
            } else if (window.innerWidth >= 1024) {
                setViewMode('table');
            }
        };

        handleResize(); // Check initial size
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { currentAccount } = useAccountStore();

    // Function to normalize task data and extract computed properties
    const normalizeTask = (task: Task): Task => {
        // Extract prompt from request_data
        let story_prompt = '';
        if (task.request_data) {
            story_prompt = task.request_data.prompt || 
                          task.request_data.story_prompt || 
                          task.request_data.content || 
                          '';
        }

        // Extract other properties from request_data
        const language = task.request_data?.language || '';
        const resolution = task.request_data?.resolution || '';
        const segments = task.request_data?.segments || task.request_data?.segment_count || 0;

        return {
            ...task,
            story_prompt,
            language,
            resolution,
            segments
        };
    };

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        handleRefresh: () => {
            fetchTasks(pagination.current, pagination.pageSize, statusFilter);
            fetchQueueStatus();
        },
        setViewMode: (mode: 'table' | 'cards') => {
            setViewMode(mode);
        },
        setSearchText: (text: string) => {
            setSearchText(text);
        },
        setStatusFilter: (filter: string) => {
            setStatusFilter(filter);
        }
    }), [pagination.current, pagination.pageSize, statusFilter]);

    // Auto-refresh interval for active tasks
    const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

    const formatTime = (timeString: string) => {
        if (!timeString) return 'N/A';
        try {
            const date = new Date(timeString);
            return date.toLocaleString();
        } catch (error) {
            return timeString;
        }
    };

    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith('.mp4')) {
            return <Play className="h-4 w-4 text-blue-500" />;
        } else if (fileName.endsWith('.jpg') || fileName.endsWith('.png')) {
            return <Image className="h-4 w-4 text-green-500" />;
        } else if (fileName.endsWith('.json')) {
            return <FileText className="h-4 w-4 text-yellow-500" />;
        } else {
            return <File className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            COMPLETED: { 
                icon: <CheckCircle2 className="h-3.5 w-3.5" />, 
                className: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
            },
            FAILED: { 
                icon: <XCircle className="h-3.5 w-3.5" />, 
                className: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
            },
            PENDING: { 
                icon: <Clock className="h-3.5 w-3.5" />, 
                className: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
            },
            PROCESSING: { 
                icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, 
                className: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
            },
            CANCELLED: { 
                icon: <StopCircle className="h-3.5 w-3.5" />, 
                className: "bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700"
            },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
        
        return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}>
                {config.icon}
                {status}
            </div>
        );    };

    const getTaskTypeBadge = (taskType: string) => {
        const typeConfig = {
            video: { 
                icon: <Play className="h-3.5 w-3.5" />, 
                className: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
            },
            quiz: { 
                icon: <FileText className="h-3.5 w-3.5" />, 
                className: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800"
            },
            animated_lesson: { 
                icon: <Image className="h-3.5 w-3.5" />, 
                className: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
            },
            documentation: { 
                icon: <File className="h-3.5 w-3.5" />, 
                className: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
            },
        };

        const config = typeConfig[taskType as keyof typeof typeConfig] || typeConfig.video;
        
        return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}>
                {config.icon}
                {taskType === 'animated_lesson' ? 'Animation' : taskType}
            </div>
        );
    };

    const taskNeedsUpdate = (task: Task) => {
        return task.status === 'PENDING' || task.status === 'PROCESSING';
    };

    const fetchTasks = async (page = 1, pageSize = 10, status = 'all') => {
        setLoading(true);
        try {
            const skip = (page - 1) * pageSize;
            const filters = status !== 'all' ? { status } : {};
            
            // Fetch tasks with total count in a single API call
            const response = await getAllTasks({ 
                skip, 
                limit: pageSize, 
                ...filters 
            });
            
            if (response && Array.isArray(response.tasks)) {
                // Normalize tasks to extract computed properties
                const normalizedTasks = response.tasks.map(normalizeTask);
                setTasks(normalizedTasks);
                
                // Set proper pagination with actual total count from response
                setPagination({
                    current: page,
                    pageSize: pageSize,
                    total: response.total
                });
            } else {
                console.error('Expected tasks array in response but got:', response);
                setTasks([]);
                setPagination(prev => ({ ...prev, total: 0 }));
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            setTasks([]);
            setPagination(prev => ({ ...prev, total: 0 }));
            toast.error('Failed to fetch tasks');
        } finally {
            setLoading(false);
        }
    };

    const fetchQueueStatus = async () => {
        try {
            const response = await getQueueStatus();
            if (response && typeof response === 'object') {
                // Check if response has data property or is direct queue status
                const queueData = response.data || response;
                setQueueStatus({
                    queue_length: queueData.queue_length || 0,
                    running_tasks: queueData.running_tasks || 0,
                    pending_tasks: queueData.pending_tasks || 0
                });
            }
        } catch (error) {
            console.error('Failed to fetch queue status:', error);
        }
    };

    const handleCancelTask = async (taskId: string) => {
        try {
            await cancelTask(taskId);
            toast.success('Task cancellation requested');
            fetchTasks(pagination.current, pagination.pageSize, statusFilter);
        } catch (error) {
            console.error('Failed to cancel task:', error);
            toast.error('Failed to cancel task');
        }
    };

    const handleRefresh = () => {
        fetchTasks(pagination.current, pagination.pageSize, statusFilter);
        fetchQueueStatus();
    };

    const showTaskDetails = (task: Task) => {
        setSelectedTaskDetails(task);
        setIsDetailsModalVisible(true);
    };

    const toggleRowExpansion = (taskId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(taskId)) {
            newExpanded.delete(taskId);
        } else {
            newExpanded.add(taskId);
        }
        setExpandedRows(newExpanded);
    };

    // Filter tasks based on search text
    const filteredTasks = tasks.filter(task => {
        if (!searchText) return true;
        const searchLower = searchText.toLowerCase();
        return (
            task.task_id.toLowerCase().includes(searchLower) ||
            task.story_prompt?.toLowerCase().includes(searchLower) ||
            task.status.toLowerCase().includes(searchLower)
        );
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            fetchTasks(pagination.current, pagination.pageSize, statusFilter);
            fetchQueueStatus();
        }
    }, [pagination.current, pagination.pageSize, statusFilter]);

    useEffect(() => {
        if (typeof window !== 'undefined' && currentAccount) {
            clearApiCachePattern(/^tasks_/);
            setPagination(prev => ({ ...prev, current: 1 }));
            fetchTasks(1, pagination.pageSize, statusFilter);
        }
    }, [currentAccount]);

    // Auto-refresh for active tasks
    useEffect(() => {
        const hasActiveTasks = tasks.some(taskNeedsUpdate);
        if (!hasActiveTasks) return;

        const interval = setInterval(() => {
            fetchTasks(pagination.current, pagination.pageSize, statusFilter);
        }, AUTO_REFRESH_INTERVAL);

        return () => clearInterval(interval);
    }, [tasks, pagination.current, pagination.pageSize, statusFilter]);

    const TaskDetailsModal = () => {
        if (!selectedTaskDetails) return null;

        return (
            <Dialog open={isDetailsModalVisible} onOpenChange={setIsDetailsModalVisible}>
                <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                <Info className="h-4 w-4 text-white" />
                            </div>
                            Task Details
                        </DialogTitle>
                        <DialogDescription>
                            Detailed information about task <span className="font-mono text-xs bg-muted/70 dark:bg-card/70 rounded px-1.5 py-0.5">{selectedTaskDetails.task_id}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 overflow-y-auto max-h-[calc(80vh-10rem)] pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Card className="border border-border bg-background/95 dark:bg-card/95">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Status Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Status:</span>
                                        {getStatusBadge(selectedTaskDetails.status)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Progress:</span>
                                            <span className="font-medium">{selectedTaskDetails.progress || 0}%</span>
                                        </div>
                                        <div className="w-full bg-muted dark:bg-muted/50 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${
                                                    selectedTaskDetails.status === 'FAILED' ? 'bg-red-500' :
                                                    selectedTaskDetails.status === 'COMPLETED' ? 'bg-green-500' :
                                                    selectedTaskDetails.status === 'PROCESSING' ? 'bg-blue-500 animate-pulse' :
                                                    'bg-amber-500'
                                                }`}
                                                style={{ width: `${selectedTaskDetails.progress || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Created:</span>
                                        <span>{formatTime(selectedTaskDetails.created_at)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Last Updated:</span>
                                        <span>{formatTime(selectedTaskDetails.updated_at)}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border border-border bg-background/95 dark:bg-card/95">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Configuration</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Language:</span>
                                        <span className="font-medium">{selectedTaskDetails.language || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Resolution:</span>
                                        <span className="font-medium">{selectedTaskDetails.resolution || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Segments:</span>
                                        <span className="font-medium">{selectedTaskDetails.segments || 'N/A'}</span>
                                    </div>
                                    {selectedTaskDetails.queue_position !== undefined && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Queue Position:</span>
                                            <Badge variant="outline" className="font-medium">
                                                {selectedTaskDetails.queue_position}
                                            </Badge>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {selectedTaskDetails.story_prompt && (
                            <Card className="border border-border bg-background/95 dark:bg-card/95">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Prompt</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-3 bg-muted/50 dark:bg-card/50 rounded-lg text-sm">
                                        {selectedTaskDetails.story_prompt}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {selectedTaskDetails.error_message && (
                            <Alert variant="destructive" className="border border-red-300 dark:border-red-900">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    <div className="font-medium mb-1">Error Message:</div>
                                    <div className="text-sm">{selectedTaskDetails.error_message}</div>
                                    {selectedTaskDetails.error_details && (
                                        <div className="mt-2">
                                            <div className="font-medium mb-1">Error Details:</div>
                                            <pre className="text-xs overflow-x-auto bg-background/80 dark:bg-card/80 p-2 rounded border border-red-200 dark:border-red-900 max-h-32 overflow-y-auto">
                                                {typeof selectedTaskDetails.error_details === 'object' 
                                                    ? JSON.stringify(selectedTaskDetails.error_details, null, 2)
                                                    : selectedTaskDetails.error_details
                                                }
                                            </pre>
                                        </div>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        {selectedTaskDetails.task_folder_content && Object.keys(selectedTaskDetails.task_folder_content).length > 0 && (
                            <Card className="border border-border bg-background/95 dark:bg-card/95">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Generated Files</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {Object.entries(selectedTaskDetails.task_folder_content).map(([key, url]) => (
                                            <div key={key} className="flex items-center justify-between p-3 bg-muted/50 dark:bg-card/50 rounded-lg border border-border hover:border-blue-300 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all duration-200">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    {getFileIcon(key)}
                                                    <span className="text-sm truncate max-w-[180px]">{key.split('/').pop()}</span>
                                                </div>
                                                <Button variant="outline" size="sm" asChild className="h-8 border-border hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400">
                                                    <a href={url as string} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                                        Open
                                                    </a>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {selectedTaskDetails.events && selectedTaskDetails.events.length > 0 && (
                            <Card className="border border-border bg-background/95 dark:bg-card/95">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Events Timeline</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                                        {selectedTaskDetails.events.slice().reverse().map((event: TaskEvent, index: number) => (
                                            <div 
                                                key={`${event.timestamp}-${index}`} 
                                                className="border-l-2 border-blue-300 dark:border-blue-800 pl-4 py-2 bg-muted/30 dark:bg-card/30 rounded-r-lg"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="h-5 text-xs font-normal bg-muted/70 dark:bg-card/70">
                                                        {new Date(event.timestamp).toLocaleTimeString()}
                                                    </Badge>
                                                    <p className="text-sm font-medium">{event.message}</p>
                                                </div>
                                                {event.details && (
                                                    <pre className="text-xs bg-muted/50 dark:bg-card/50 p-2 rounded mt-2 overflow-x-auto max-h-32 overflow-y-auto">
                                                        {typeof event.details === 'object' 
                                                            ? JSON.stringify(event.details, null, 2)
                                                            : event.details
                                                        }
                                                    </pre>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    return (
        <div className="space-y-6">
            <div className="mb-4 md:mb-6">

                {/* Queue Status */}
                {queueStatus && (
                    <Card className="mb-6 border border-border bg-background/95 dark:bg-card/95 hover:shadow-sm transition-all duration-300 overflow-hidden">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative flex flex-col items-center justify-center p-5 rounded-lg border border-border overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-600/10"></div>
                                    <div className="relative z-10">
                                        <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                                            {queueStatus.queue_length}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Total in Queue
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="relative flex flex-col items-center justify-center p-5 rounded-lg border border-border overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-600/10"></div>
                                    <div className="relative z-10">
                                        <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent flex items-center gap-2">
                                            {queueStatus.running_tasks}
                                            {queueStatus.running_tasks > 0 && (
                                                <div className="relative h-2 w-2">
                                                    <div className="absolute h-full w-full rounded-full bg-green-500 animate-ping opacity-75"></div>
                                                    <div className="relative h-full w-full rounded-full bg-green-500"></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Currently Running
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="relative flex flex-col items-center justify-center p-5 rounded-lg border border-border overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-600/10"></div>
                                    <div className="relative z-10">
                                        <div className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent">
                                            {queueStatus.pending_tasks}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            Pending Tasks
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Tasks Display - Table or Cards based on viewMode */}
            {viewMode === 'table' ? (
                <Card className="border border-border bg-background/95 dark:bg-card/95 hover:shadow-sm transition-all duration-300 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto overflow-y-hidden">
                            <div className="min-w-[900px]"> {/* Ensure minimum width for proper layout */}
                                <Table className="w-full">
                                <TableHeader>
                                    <TableRow className="bg-muted/50 dark:bg-card/50 hover:bg-muted/70 dark:hover:bg-card/70">
                                        <TableHead className="w-12 min-w-[48px]"></TableHead>                                        <TableHead className="font-medium min-w-[120px]">Task ID</TableHead>
                                        <TableHead className="font-medium min-w-[140px]">Status</TableHead>
                                        <TableHead className="font-medium min-w-[100px]">Type</TableHead>
                                        <TableHead className="font-medium min-w-[120px]">Progress</TableHead>
                                        <TableHead className="font-medium min-w-[140px]">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Created
                                            </div>
                                        </TableHead>
                                        <TableHead className="font-medium min-w-[200px] max-w-[300px]">Prompt</TableHead>
                                        <TableHead className="font-medium text-right min-w-[150px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                            <TableBody>
                                {loading ? (
                                    // Modern skeleton loader with staggered animation
                                    <>
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <TableRow key={index} className="animate-pulse border-b border-border">
                                                <TableCell className="w-12 min-w-[48px]">
                                                    <div className="h-8 w-8 bg-muted/60 rounded-full" style={{animationDelay: `${index * 0.1}s`}}></div>
                                                </TableCell>
                                                <TableCell className="min-w-[120px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-20 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.05}s`}}></div>
                                                    </div>
                                                </TableCell>                                                <TableCell className="min-w-[140px]">
                                                    <div className="h-6 w-24 bg-muted/60 rounded-full" style={{animationDelay: `${index * 0.1 + 0.1}s`}}></div>
                                                </TableCell>
                                                <TableCell className="min-w-[100px]">
                                                    <div className="h-6 w-16 bg-muted/60 rounded-full" style={{animationDelay: `${index * 0.1 + 0.12}s`}}></div>
                                                </TableCell>
                                                <TableCell className="min-w-[120px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2.5 w-16 bg-muted/60 rounded-full" style={{animationDelay: `${index * 0.1 + 0.15}s`}}></div>
                                                        <div className="h-4 w-8 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.2}s`}}></div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="min-w-[140px]">
                                                    <div className="space-y-1">
                                                        <div className="h-4 w-16 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.25}s`}}></div>
                                                        <div className="h-3 w-12 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.3}s`}}></div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="min-w-[200px] max-w-[300px]">
                                                    <div className="space-y-1">
                                                        <div className="h-4 w-full bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.35}s`}}></div>
                                                        <div className="h-3 w-3/4 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.4}s`}}></div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="min-w-[150px]">
                                                    <div className="flex gap-1.5 justify-end">
                                                        <div className="h-8 w-16 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.45}s`}}></div>
                                                        <div className="h-8 w-16 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.5}s`}}></div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                ) : filteredTasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="p-3 bg-muted rounded-full">
                                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                                <p className="text-muted-foreground">No tasks found</p>
                                                {searchText && (
                                                    <Button variant="outline" size="sm" onClick={() => setSearchText('')}>
                                                        Clear search
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTasks.map((task) => (
                                        <React.Fragment key={task.task_id}>
                                            <TableRow className="cursor-pointer hover:bg-muted/50 dark:hover:bg-card/50 transition-colors group">
                                                <TableCell className="w-12 min-w-[48px]">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleRowExpansion(task.task_id)}
                                                        className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                                    >
                                                        {expandedRows.has(task.task_id) ? 
                                                            <ChevronUp className="h-4 w-4" /> : 
                                                            <ChevronDown className="h-4 w-4" />
                                                        }
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm min-w-[120px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-muted dark:bg-card/90 px-2 py-1 rounded text-xs truncate max-w-[100px]" title={task.task_id}>
                                                            {task.task_id.substring(0, 8)}
                                                        </span>
                                                    </div>
                                                </TableCell>                                                <TableCell className="min-w-[140px]">
                                                    <div className="w-full max-w-[140px]">
                                                        {getStatusBadge(task.status)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="min-w-[100px]">
                                                    <div className="w-full max-w-[100px]">
                                                        {getTaskTypeBadge(task.task_type || 'video')}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="min-w-[120px]">
                                                    <div className="flex items-center gap-2 max-w-[120px]">
                                                        <div className="flex-1 min-w-[60px] bg-muted dark:bg-muted/50 rounded-full h-2.5 overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-300 ${
                                                                    task.status === 'FAILED' ? 'bg-red-500' :
                                                                    task.status === 'COMPLETED' ? 'bg-green-500' :
                                                                    task.status === 'PROCESSING' ? 'bg-blue-500 animate-pulse' :
                                                                    'bg-amber-500'
                                                                }`}
                                                                style={{ width: `${task.progress || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-medium min-w-[35px] text-right">{task.progress || 0}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm min-w-[140px]">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="text-xs bg-muted/70 dark:bg-card/70 rounded-full px-2 py-0.5 w-fit">
                                                            {new Date(task.created_at).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {new Date(task.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="min-w-[200px] max-w-[300px]">
                                                    <div className="truncate text-sm" title={task.story_prompt || 'N/A'}>
                                                        {task.story_prompt || 'N/A'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="min-w-[150px]">
                                                    <div className="flex gap-1.5 justify-end flex-wrap">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => showTaskDetails(task)}
                                                            className="h-8 border-border hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 text-xs"
                                                        >
                                                            <Info className="h-3.5 w-3.5 md:mr-1" />
                                                            <span className="hidden md:inline">Details</span>
                                                        </Button>
                                                        {(task.status === 'PENDING' || task.status === 'PROCESSING') && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (confirm('Are you sure you want to cancel this task?')) {
                                                                        handleCancelTask(task.task_id);
                                                                    }
                                                                }}
                                                                className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30 text-xs"
                                                            >
                                                                <StopCircle className="h-3.5 w-3.5 md:mr-1" />
                                                                <span className="hidden md:inline">Cancel</span>
                                                            </Button>
                                                        )}                                                        {task.result_url && (
                                                            <>
                                                                {task.task_type === 'quiz' ? (
                                                                    <QuizModal task={task}>
                                                                        <Button
                                                                            variant="default"
                                                                            size="sm"
                                                                            className="h-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-xs"
                                                                        >
                                                                            <Play className="h-3.5 w-3.5 md:mr-1" />
                                                                            <span className="hidden md:inline">View Quiz</span>
                                                                        </Button>
                                                                    </QuizModal>
                                                                ) : (
                                                                    <Button
                                                                        variant="default"
                                                                        size="sm"
                                                                        asChild
                                                                        className="h-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-xs"
                                                                    >
                                                                        <a href={task.result_url} target="_blank" rel="noopener noreferrer">
                                                                            <Play className="h-3.5 w-3.5 md:mr-1" />
                                                                            <span className="hidden md:inline">View</span>
                                                                        </a>
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        {expandedRows.has(task.task_id) && (
                                            <TableRow>
                                                <TableCell colSpan={8} className="bg-muted/30 dark:bg-card/30 p-4">
                                                    <div className="space-y-4 rounded-lg border border-border p-4 bg-background/80 dark:bg-card/80 shadow-sm">
                                                        {/* Task Details Grid */}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Full Task ID</div>
                                                                <div className="font-mono bg-muted/50 dark:bg-card/50 p-1.5 rounded text-xs overflow-auto">
                                                                    {task.task_id}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Task Type</div>
                                                                <div className="font-medium">{task.task_type || 'video'}</div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Priority</div>
                                                                <div className="font-medium">{task.priority || 'normal'}</div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Last Updated</div>
                                                                <div className="font-medium">{formatTime(task.updated_at)}</div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Language</div>
                                                                <div className="font-medium">{task.language || 'N/A'}</div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Resolution</div>
                                                                <div className="font-medium">{task.resolution || 'N/A'}</div>
                                                            </div>
                                                        </div>

                                                        {task.segments && (
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Segments</div>
                                                                <div className="font-medium">{task.segments}</div>
                                                            </div>
                                                        )}

                                                        {/* Full Prompt Display */}
                                                        {task.story_prompt && (
                                                            <div className="space-y-2">
                                                                <div className="text-xs text-muted-foreground">Full Prompt</div>
                                                                <div className="p-3 bg-muted/50 dark:bg-card/50 rounded-lg text-sm max-h-32 overflow-y-auto">
                                                                    {task.story_prompt}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Request Data Preview */}
                                                        {task.request_data && Object.keys(task.request_data).length > 0 && (
                                                            <div className="space-y-2">
                                                                <div className="text-xs text-muted-foreground">Request Configuration</div>
                                                                <div className="p-3 bg-muted/50 dark:bg-card/50 rounded-lg text-xs font-mono max-h-40 overflow-y-auto">
                                                                    <pre>{JSON.stringify(task.request_data, null, 2)}</pre>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Error Display */}
                                                        {task.error_message && (
                                                            <Alert variant="destructive" className="mt-4">
                                                                <AlertTriangle className="h-4 w-4" />
                                                                <AlertDescription className="text-sm">
                                                                    <span className="font-medium">Error:</span> {task.error_message}
                                                                    {task.error_details && (
                                                                        <div className="mt-2">
                                                                            <div className="font-medium mb-1">Details:</div>
                                                                            <pre className="text-xs overflow-x-auto bg-background/80 dark:bg-card/80 p-2 rounded border border-red-200 dark:border-red-900 max-h-32 overflow-y-auto">
                                                                                {typeof task.error_details === 'object' 
                                                                                    ? JSON.stringify(task.error_details, null, 2)
                                                                                    : task.error_details
                                                                                }
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                </AlertDescription>
                                                            </Alert>
                                                        )}

                                                        {/* Recent Events */}
                                                        {task.events && task.events.length > 0 && (
                                                            <div className="space-y-2">
                                                                <div className="text-xs text-muted-foreground">Recent Events</div>
                                                                <div className="max-h-32 overflow-y-auto space-y-2">
                                                                    {task.events.slice(-3).reverse().map((event: TaskEvent, index: number) => (
                                                                        <div 
                                                                            key={`${event.timestamp}-${index}`} 
                                                                            className="border-l-2 border-blue-300 dark:border-blue-800 pl-3 py-1 bg-muted/20 dark:bg-card/20 rounded-r"
                                                                        >
                                                                            <div className="flex items-center gap-2 text-xs">
                                                                                <span className="text-muted-foreground">
                                                                                    {new Date(event.timestamp).toLocaleTimeString()}
                                                                                </span>
                                                                                <span className="font-medium">{event.message}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </TableBody>
                        </Table>
                        </div>
                    </div>
                </CardContent>
                <div className="p-4 border-t border-border flex justify-center">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious 
                                    onClick={() => setPagination({...pagination, current: Math.max(1, pagination.current - 1)})}
                                    className={pagination.current === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                            
                            {pagination.current > 2 && (
                                <PaginationItem>
                                    <PaginationLink onClick={() => setPagination({...pagination, current: 1})}>
                                        1
                                    </PaginationLink>
                                </PaginationItem>
                            )}
                            
                            {pagination.current > 3 && (
                                <PaginationItem>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            )}
                            
                            {pagination.current > 1 && (
                                <PaginationItem>
                                    <PaginationLink onClick={() => setPagination({...pagination, current: pagination.current - 1})}>
                                        {pagination.current - 1}
                                    </PaginationLink>
                                </PaginationItem>
                            )}
                            
                            <PaginationItem>
                                <PaginationLink isActive>
                                    {pagination.current}
                                </PaginationLink>
                            </PaginationItem>
                            
                            {(pagination.current * pagination.pageSize) < pagination.total && (
                                <PaginationItem>
                                    <PaginationLink onClick={() => setPagination({...pagination, current: pagination.current + 1})}>
                                        {pagination.current + 1}
                                    </PaginationLink>
                                </PaginationItem>
                            )}
                            
                            {(pagination.current + 1) * pagination.pageSize < pagination.total && (
                                <PaginationItem>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            )}
                            
                            {(pagination.current + 2) * pagination.pageSize < pagination.total && (
                                <PaginationItem>
                                    <PaginationLink onClick={() => setPagination({...pagination, current: Math.ceil(pagination.total / pagination.pageSize)})}>
                                        {Math.ceil(pagination.total / pagination.pageSize)}
                                    </PaginationLink>
                                </PaginationItem>
                            )}
                            
                            <PaginationItem>
                                <PaginationNext 
                                    onClick={() => setPagination({
                                        ...pagination, 
                                        current: (pagination.current * pagination.pageSize) < pagination.total 
                                            ? pagination.current + 1 
                                            : pagination.current
                                    })}
                                    className={(pagination.current * pagination.pageSize) >= pagination.total ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </Card>
            ) : (
                // Cards View for Mobile/Alternative Display
                <div className="space-y-4">
                    {loading ? (
                        // Card skeleton loader
                        <>
                            {Array.from({ length: 3 }).map((_, index) => (
                                <Card key={index} className="animate-pulse border border-border bg-background/95 dark:bg-card/95">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="h-6 w-24 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1}s`}}></div>
                                            <div className="h-6 w-20 bg-muted/60 rounded-full" style={{animationDelay: `${index * 0.1 + 0.1}s`}}></div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2.5 w-32 bg-muted/60 rounded-full" style={{animationDelay: `${index * 0.1 + 0.2}s`}}></div>
                                                <div className="h-4 w-12 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.3}s`}}></div>
                                            </div>
                                            <div className="h-4 w-full bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.4}s`}}></div>
                                            <div className="h-3 w-3/4 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.5}s`}}></div>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <div className="h-8 w-16 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.6}s`}}></div>
                                            <div className="h-8 w-16 bg-muted/60 rounded" style={{animationDelay: `${index * 0.1 + 0.7}s`}}></div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </>
                    ) : filteredTasks.length === 0 ? (
                        <Card className="border border-border bg-background/95 dark:bg-card/95">
                            <CardContent className="p-8">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="p-3 bg-muted rounded-full">
                                        <FileText className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground">No tasks found</p>
                                    {searchText && (
                                        <Button variant="outline" size="sm" onClick={() => setSearchText('')}>
                                            Clear search
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredTasks.map((task) => (
                            <Card key={task.task_id} className="border border-border bg-background/95 dark:bg-card/95 hover:shadow-md transition-all duration-200">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs bg-muted dark:bg-card/90 px-2 py-1 rounded" title={task.task_id}>
                                                {task.task_id.substring(0, 8)}
                                            </span>
                                        </div>
                                        {getStatusBadge(task.status)}
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-muted dark:bg-muted/50 rounded-full h-2.5 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        task.status === 'FAILED' ? 'bg-red-500' :
                                                        task.status === 'COMPLETED' ? 'bg-green-500' :
                                                        task.status === 'PROCESSING' ? 'bg-blue-500 animate-pulse' :
                                                        'bg-amber-500'
                                                    }`}
                                                    style={{ width: `${task.progress || 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-medium min-w-[35px] text-right">{task.progress || 0}%</span>
                                        </div>
                                        
                                        <div className="text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span className="text-xs">
                                                    {new Date(task.created_at).toLocaleDateString()} {new Date(task.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {task.story_prompt && (
                                            <div className="text-sm">
                                                <p className="text-muted-foreground text-xs mb-1">Prompt:</p>
                                                <p className="line-clamp-2" title={task.story_prompt}>
                                                    {task.story_prompt}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2 mt-4 flex-wrap">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => showTaskDetails(task)}
                                            className="h-8 border-border hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 text-xs flex-1"
                                        >
                                            <Info className="h-3.5 w-3.5 mr-1" />
                                            Details
                                        </Button>
                                        {(task.status === 'PENDING' || task.status === 'PROCESSING') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to cancel this task?')) {
                                                        handleCancelTask(task.task_id);
                                                    }
                                                }}
                                                className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30 text-xs flex-1"
                                            >
                                                <StopCircle className="h-3.5 w-3.5 mr-1" />
                                                Cancel
                                            </Button>
                                        )}                                        {task.result_url && (
                                            <>
                                                {task.task_type === 'quiz' ? (
                                                    <QuizModal task={task}>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="h-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-xs flex-1"
                                                        >
                                                            <Play className="h-3.5 w-3.5 mr-1" />
                                                            View Quiz
                                                        </Button>
                                                    </QuizModal>
                                                ) : (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        asChild
                                                        className="h-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-xs flex-1"
                                                    >
                                                        <a href={task.result_url} target="_blank" rel="noopener noreferrer">
                                                            <Play className="h-3.5 w-3.5 mr-1" />
                                                            View
                                                        </a>
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                    
                    {/* Pagination for cards view */}
                    {filteredTasks.length > 0 && (
                        <div className="flex justify-center mt-6">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious 
                                            onClick={() => setPagination({...pagination, current: Math.max(1, pagination.current - 1)})}
                                            className={pagination.current === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                    
                                    {pagination.current > 2 && (
                                        <PaginationItem>
                                            <PaginationLink onClick={() => setPagination({...pagination, current: 1})}>
                                                1
                                            </PaginationLink>
                                        </PaginationItem>
                                    )}
                                    
                                    {pagination.current > 3 && (
                                        <PaginationItem>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    )}
                                    
                                    {pagination.current > 1 && (
                                        <PaginationItem>
                                            <PaginationLink onClick={() => setPagination({...pagination, current: pagination.current - 1})}>
                                                {pagination.current - 1}
                                            </PaginationLink>
                                        </PaginationItem>
                                    )}
                                    
                                    <PaginationItem>
                                        <PaginationLink isActive>
                                            {pagination.current}
                                        </PaginationLink>
                                    </PaginationItem>
                                                     {(pagination.current * pagination.pageSize) < pagination.total && (
                        <PaginationItem>
                            <PaginationLink onClick={() => setPagination({...pagination, current: pagination.current + 1})}>
                                {pagination.current + 1}
                            </PaginationLink>
                        </PaginationItem>
                    )}
                    
                    {(pagination.current + 1) * pagination.pageSize < pagination.total && (
                        <PaginationItem>
                            <PaginationEllipsis />
                        </PaginationItem>
                    )}
                    
                    {(pagination.current + 2) * pagination.pageSize < pagination.total && (
                        <PaginationItem>
                            <PaginationLink onClick={() => setPagination({...pagination, current: Math.ceil(pagination.total / pagination.pageSize)})}>
                                {Math.ceil(pagination.total / pagination.pageSize)}
                            </PaginationLink>
                        </PaginationItem>
                    )}
                    
                    <PaginationItem>
                        <PaginationNext 
                            onClick={() => setPagination({
                                ...pagination, 
                                current: (pagination.current * pagination.pageSize) < pagination.total 
                                    ? pagination.current + 1 
                                    : pagination.current
                            })}
                            className={(pagination.current * pagination.pageSize) >= pagination.total ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </div>
            )}

            <TaskDetailsModal />
        </div>
    );
});

TasksList.displayName = 'TasksList';

export default TasksList;
