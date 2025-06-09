import { useRef, useEffect } from 'react';
import { useVideoStore } from "../../stores/index";
import styles from './index.module.css';
import { TaskEvent } from '../../services/index';
import { 
    CheckCircle2, 
    Clock, 
    Loader2, 
    AlertTriangle, 
    XCircle, 
    ExternalLink, 
    Play, 
    Image, 
    FileText, 
    File,
    Download,
    Eye,
    Sparkles,
    Video,
    Calendar,
    Share2
} from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function VideoResult() {
    const { videoUrl, isLoading, error, taskStatus } = useVideoStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    const formatTime = (timeString: string) => {
        if (!timeString) return 'N/A';
        try {
            const date = new Date(timeString);
            return date.toLocaleString();
        } catch (error) {
            return timeString;
        }
    };

    // Function to render file type icon
    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith('.mp4')) {
            return <Play className="h-6 w-6 text-blue-500" />;
        } else if (fileName.endsWith('.jpg') || fileName.endsWith('.png')) {
            return <Image className="h-6 w-6 text-green-500" />;
        } else if (fileName.endsWith('.json')) {
            return <FileText className="h-6 w-6 text-yellow-500" />;
        } else {
            return <File className="h-6 w-6 text-gray-500" />;
        }
    };

    // Task folder content modal
    const TaskFolderContentModal = () => {
        if (!taskStatus?.task_folder_content) return null;

        return (
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="link" size="sm">
                        View All Files
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>Task Folder Contents</DialogTitle>
                        <DialogDescription>
                            All files generated for this task
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto">
                        <div className="space-y-3">
                            {Object.entries(taskStatus.task_folder_content).map(([key, url]) => (
                                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {getFileIcon(key)}
                                        <div>
                                            <p className="font-medium">{key.split('/').pop()}</p>
                                            <p className="text-sm text-gray-500">{key}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={url as string} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Open
                                        </a>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    return (
        <div className={styles.videoResult}>
            {/* Task status display */}
            {taskStatus && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Task Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">Task ID:</span> {taskStatus.task_id}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Status:</span>
                                    <Badge 
                                        variant={
                                            taskStatus.status === 'COMPLETED' ? 'default' :
                                            taskStatus.status === 'FAILED' ? 'destructive' :
                                            taskStatus.status === 'PROCESSING' ? 'secondary' : 'outline'
                                        }
                                        className="flex items-center gap-1"
                                    >
                                        {taskStatus.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3" />}
                                        {taskStatus.status === 'FAILED' && <XCircle className="h-3 w-3" />}
                                        {taskStatus.status === 'PENDING' && <Clock className="h-3 w-3" />}
                                        {taskStatus.status === 'PROCESSING' && <Loader2 className="h-3 w-3 animate-spin" />}
                                        {taskStatus.status}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="font-medium">Progress:</span>
                                    <Badge variant="outline" className="ml-2">
                                        {taskStatus.progress || 0}%
                                    </Badge>
                                </div>
                                <div>
                                    <span className="font-medium">Last Updated:</span> {formatTime(taskStatus.updated_at)}
                                </div>
                            </div>

                            <Progress value={taskStatus.progress || 0} className="w-full" />

                            {/* Display task folder content information if available */}
                            {taskStatus.task_folder_content && (
                                <div className="p-3 bg-muted dark:bg-card rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Task Contents:</span>
                                            <Badge variant="default">
                                                {Object.keys(taskStatus.task_folder_content).length} files
                                            </Badge>
                                        </div>
                                        <TaskFolderContentModal />
                                    </div>
                                </div>
                            )}

                            {/* Progress timeline */}
                            {taskStatus.events && taskStatus.events.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-3">Progress Timeline</h4>
                                    <div 
                                        ref={timelineRef}
                                        className="max-h-64 overflow-y-auto space-y-3 pl-4 border-l-2 border-gray-200"
                                    >
                                        {taskStatus.events.slice().reverse().map((event: TaskEvent, index: number) => {
                                            const isError = taskStatus.status === 'FAILED' && 
                                                          taskStatus.events.length - 1 - index === 0 && 
                                                          taskStatus.progress < 100;
                                            
                                            return (
                                                <div 
                                                    key={`${event.timestamp}-${index}`}
                                                    className={`relative pl-6 pb-3 ${isError ? 'text-red-600' : ''}`}
                                                >
                                                    <div className={`absolute -left-2 w-4 h-4 rounded-full ${
                                                        isError ? 'bg-red-500' : 'bg-blue-500'
                                                    }`} />
                                                    <p className="font-medium text-sm">
                                                        {formatTime(event.timestamp)}: {event.message}
                                                    </p>
                                                    {event.details && (
                                                        <pre className="text-xs bg-muted dark:bg-card p-2 rounded mt-2 overflow-x-auto whitespace-pre-wrap">
                                                            {typeof event.details === 'object'
                                                                ? JSON.stringify(event.details, null, 2)
                                                                : event.details}
                                                        </pre>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Loading state */}
            {isLoading && !taskStatus && (
                <Card className="text-center py-12">
                    <CardContent>
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                            <div>
                                <h3 className="text-lg font-semibold">Initializing video generation...</h3>
                                <p className="text-gray-600">Please wait while we set up your video task. This may take a moment.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error state - only show when no taskStatus is present */}
            {error && !taskStatus && (
                <Alert variant="destructive" className="max-w-2xl mx-auto my-5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Enhanced Video player */}
            {!isLoading && !error && videoUrl && (
                <Card className="shadow-2xl border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
                    <CardHeader className="pb-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm">
                        <CardTitle className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 rounded-2xl shadow-xl">
                                <CheckCircle2 className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent">
                                    🎉 Your Lesson is Ready!
                                </h2>
                                <div className="flex items-center gap-3 mt-2">
                                    <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        AI Generated
                                    </Badge>
                                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                                        <Video className="h-3 w-3 mr-1" />
                                        HD Quality
                                    </Badge>
                                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Ready Now
                                    </Badge>
                                </div>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8 p-8">
                        {/* Enhanced Video Player */}
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-black to-slate-900 shadow-2xl border border-white/10">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-10"></div>
                            <video ref={videoRef} controls className="w-full h-auto max-h-[600px] object-contain">
                                <source src={videoUrl} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                        
                        {/* Enhanced Action Buttons */}
                        <div className="flex flex-wrap gap-4">
                            <Button 
                                size="lg"
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center gap-3 px-6 py-3 rounded-xl shadow-xl"
                                onClick={() => window.open(videoUrl, '_blank')}
                            >
                                <Eye className="h-5 w-5" />
                                View Full Screen
                            </Button>
                            <Button 
                                size="lg"
                                variant="outline" 
                                className="border-white/30 text-white hover:bg-white/20 flex items-center gap-3 px-6 py-3 rounded-xl backdrop-blur-sm"
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = videoUrl;
                                    link.download = `ai-lesson-${Date.now()}.mp4`;
                                    link.click();
                                }}
                            >
                                <Download className="h-5 w-5" />
                                Download Lesson
                            </Button>
                            <Button 
                                size="lg"
                                variant="outline" 
                                className="border-white/30 text-white hover:bg-white/20 flex items-center gap-3 px-6 py-3 rounded-xl backdrop-blur-sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(videoUrl);
                                }}
                            >
                                <Share2 className="h-5 w-5" />
                                Copy Link
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* if no video URL, show placeholder */}
            {!videoUrl && !isLoading && !taskStatus && (
                <Card className="text-center py-12">
                    <CardContent>
                        <div className="flex flex-col items-center gap-4">
                            <Play className="h-16 w-16 text-gray-400" />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700">No Video Available</h3>
                                <p className="text-gray-500">Please generate a video first.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
