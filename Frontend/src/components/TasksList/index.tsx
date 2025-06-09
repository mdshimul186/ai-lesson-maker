import React, { useState, useEffect, useCallback } from 'react';
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
    Filter
} from 'lucide-react';
import { 
    TaskEvent, 
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

// Types
interface Task {
    task_id: string;
    status: string;
    progress: number;
    created_at: string;
    updated_at: string;
    queue_position?: number;
    story_prompt?: string;
    segments?: number;
    language?: string;
    resolution?: string;
    result_url?: string;
    error_message?: string;
    error_details?: any;
    events?: TaskEvent[];
    task_folder_content?: Record<string, string>;
}

interface QueueStatus {
    queue_length: number;
    running_tasks: number;
    pending_tasks: number;
}



const TasksList: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
    const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
    const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const { currentAccount } = useAccountStore();

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
            
            const response = await getAllTasks({ 
                skip, 
                limit: pageSize, 
                ...filters 
            });
            
            if (Array.isArray(response)) {
                setTasks(response);
                setPagination({
                    ...pagination,
                    current: page,
                    total: response.length + skip
                });
            } else {
                console.error('Expected array of tasks but got:', response);
                setTasks([]);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            setTasks([]);
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
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Tasks Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">Monitor and manage your AI video generation tasks</p>
                    </div>
                    <Button 
                        onClick={handleRefresh} 
                        variant="outline" 
                        className="flex items-center gap-2 border border-border hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh Data
                    </Button>
                </div>

                {/* Queue Status */}
                {queueStatus && (
                    <Card className="mb-6 border border-border bg-background/95 dark:bg-card/95 hover:shadow-sm transition-all duration-300 overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-foreground">
                                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                    <Clock className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-lg">Task Processing Status</span>
                            </CardTitle>
                            <CardDescription>Current server processing information</CardDescription>
                        </CardHeader>
                        <CardContent>
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

                <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 mb-6">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tasks by ID or prompt..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="pl-9 bg-background/80 dark:bg-card/80 border-border"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium hidden md:inline">Status:</span>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-40 bg-background/80 dark:bg-card/80 border-border">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="PROCESSING">Processing</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="FAILED">Failed</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Tasks Table */}
            <Card className="border border-border bg-background/95 dark:bg-card/95 hover:shadow-sm transition-all duration-300">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                            <FileText className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-lg">Your Tasks</span>
                    </CardTitle>
                    <CardDescription>Manage your video generation tasks</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 dark:bg-card/50 hover:bg-muted/70 dark:hover:bg-card/70">
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead className="font-medium">Task ID</TableHead>
                                    <TableHead className="font-medium">Status</TableHead>
                                    <TableHead className="font-medium">Progress</TableHead>
                                    <TableHead className="font-medium">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Created
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-medium">Prompt</TableHead>
                                    <TableHead className="font-medium text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                                                <p className="text-muted-foreground">Loading your tasks...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-64 text-center">
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
                                            <TableRow className="cursor-pointer hover:bg-muted/50 dark:hover:bg-card/50 transition-colors">
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleRowExpansion(task.task_id)}
                                                        className="h-8 w-8 p-0 rounded-full"
                                                    >
                                                        {expandedRows.has(task.task_id) ? 
                                                            <ChevronUp className="h-4 w-4" /> : 
                                                            <ChevronDown className="h-4 w-4" />
                                                        }
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-muted dark:bg-card/90 px-2 py-1 rounded text-xs">
                                                            {task.task_id.substring(0, 8)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="w-[120px]">
                                                        {getStatusBadge(task.status)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 bg-muted dark:bg-muted/50 rounded-full h-2.5 overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${
                                                                    task.status === 'FAILED' ? 'bg-red-500' :
                                                                    task.status === 'COMPLETED' ? 'bg-green-500' :
                                                                    task.status === 'PROCESSING' ? 'bg-blue-500 animate-pulse' :
                                                                    'bg-amber-500'
                                                                }`}
                                                                style={{ width: `${task.progress || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-medium">{task.progress || 0}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="text-xs bg-muted/70 dark:bg-card/70 rounded-full px-2 py-0.5">
                                                            {new Date(task.created_at).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {new Date(task.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-xs">
                                                    <div className="truncate text-sm">
                                                        {task.story_prompt || 'N/A'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2 justify-end">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => showTaskDetails(task)}
                                                            className="h-8 border-border hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400"
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
                                                                className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
                                                            >
                                                                <StopCircle className="h-3.5 w-3.5 mr-1" />
                                                                Cancel
                                                            </Button>
                                                        )}
                                                        {task.result_url && (
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                asChild
                                                                className="h-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                                            >
                                                                <a href={task.result_url} target="_blank" rel="noopener noreferrer">
                                                                    <Play className="h-3.5 w-3.5 mr-1" />
                                                                    View
                                                                </a>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        {expandedRows.has(task.task_id) && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="bg-muted/30 dark:bg-card/30 p-4">
                                                    <div className="space-y-4 rounded-lg border border-border p-4 bg-background/80 dark:bg-card/80 shadow-sm">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Task ID</div>
                                                                <div className="font-mono bg-muted/50 dark:bg-card/50 p-1.5 rounded text-xs overflow-auto">
                                                                    {task.task_id}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Last Updated</div>
                                                                <div className="font-medium">{formatTime(task.updated_at)}</div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Resolution</div>
                                                                <div className="font-medium">{task.resolution || 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Language</div>
                                                                <div className="font-medium">{task.language || 'N/A'}</div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-muted-foreground">Segments</div>
                                                                <div className="font-medium">{task.segments || 'N/A'}</div>
                                                            </div>
                                                            {task.queue_position && (
                                                                <div className="space-y-1">
                                                                    <div className="text-xs text-muted-foreground">Queue Position</div>
                                                                    <div className="font-medium">{task.queue_position}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {task.error_message && (
                                                            <Alert variant="destructive" className="mt-4">
                                                                <AlertTriangle className="h-4 w-4" />
                                                                <AlertDescription className="text-sm">
                                                                    <span className="font-medium">Error:</span> {task.error_message}
                                                                </AlertDescription>
                                                            </Alert>
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
                            
                            {(pagination.current + 2) * pagination.pageSize < pagination.total && (
                                <PaginationItem>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            )}
                            
                            {(pagination.current + 3) * pagination.pageSize < pagination.total && (
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

            <TaskDetailsModal />
        </div>
    );
};

export default TasksList;
