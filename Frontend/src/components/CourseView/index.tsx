import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BookOpen,
    ArrowLeft,
    Folder,
    FileText,
    Video,
    Download,
    RotateCw,
    Edit,
    Trash2,
    Plus,
    GripVertical,
    MoreVertical,
    Play,
    Clock,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// shadcn/ui components
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../ui/alert-dialog';
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

import {
    getCourse,
    CourseResponse,
    getCourseProgress,
    updateCourse,
    generateLessonVideo,
    getTaskStatus
} from '@/services/index';
import { useAccountStore } from '@/stores';

// Item types for drag and drop
const ItemTypes = {
    LESSON: 'lesson',
    CHAPTER: 'chapter'
};

interface EditModalData {
    type: 'chapter' | 'lesson';
    data: any;
    chapterIndex?: number;
    lessonIndex?: number;
}

// Draggable Lesson Component
interface DraggableLessonProps {
    lesson: any;
    lessonIndex: number;
    chapterIndex: number;
    onMove: (dragIndex: number, hoverIndex: number, dragChapterIndex: number, hoverChapterIndex: number) => void;
    onEdit: (lesson: any, lessonIndex: number, chapterIndex: number) => void;
    onDelete: (lessonIndex: number, chapterIndex: number) => void;
    onSelect: (lesson: any) => void;
    onGenerateVideo: (lesson: any, lessonIndex: number, chapterIndex: number) => void;
    isSelected: boolean;
}

const DraggableLesson: React.FC<DraggableLessonProps> = ({
    lesson,
    lessonIndex,
    chapterIndex,
    onMove,
    onEdit,
    onDelete,
    onSelect,
    onGenerateVideo,
    isSelected
}) => {
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.LESSON,
        item: { lessonIndex, chapterIndex, type: 'lesson' },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: ItemTypes.LESSON,
        hover: (draggedItem: any) => {
            if (draggedItem.lessonIndex !== lessonIndex || draggedItem.chapterIndex !== chapterIndex) {
                onMove(draggedItem.lessonIndex, lessonIndex, draggedItem.chapterIndex, chapterIndex);
                draggedItem.lessonIndex = lessonIndex;
                draggedItem.chapterIndex = chapterIndex;
            }
        },
    });

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const getStatusBadge = () => {
        if (lesson.task_id) {
            const status = lesson.status || 'pending';
            const statusConfig = {
                completed: { variant: 'default' as const, icon: CheckCircle, text: 'Completed' },
                processing: { variant: 'secondary' as const, icon: Clock, text: 'Processing' },
                failed: { variant: 'destructive' as const, icon: AlertCircle, text: 'Failed' },
                pending: { variant: 'outline' as const, icon: Clock, text: 'Pending' }
            };
            const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
            const IconComponent = config.icon;
            return (
                <Badge variant={config.variant} className="flex items-center gap-1">
                    <IconComponent className="w-3 h-3" />
                    {config.text}
                </Badge>
            );
        }
        return <Badge variant="secondary">Draft</Badge>;
    };

    return (
        <div
            ref={node => {
                drag(drop(node));
            }}
            className={`
                p-3 m-1 rounded-lg border transition-all duration-200 cursor-move
                ${isDragging ? 'opacity-50' : 'opacity-100'}
                ${isSelected 
                    ? 'border-primary bg-primary/10 shadow-md dark:bg-primary/20' 
                    : 'border-border bg-muted hover:bg-card hover:border-border'
                }
            `}
            onClick={() => onSelect(lesson)}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    {lesson.video_url ? (
                        <Video className="w-4 h-4 text-green-500" />
                    ) : (
                        <FileText className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                        Lesson {lessonIndex + 1}: {lesson.title}
                    </span>
                    {getStatusBadge()}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(lesson, lessonIndex, chapterIndex)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Lesson
                        </DropdownMenuItem>
                        {(!lesson.task_id && !lesson.video_url) && (
                            <DropdownMenuItem onClick={() => onGenerateVideo(lesson, lessonIndex, chapterIndex)}>
                                <Video className="w-4 h-4 mr-2" />
                                Generate Video
                            </DropdownMenuItem>
                        )}
                        {(lesson.video_url || lesson.task_id) && (
                            <DropdownMenuItem onClick={() => onGenerateVideo(lesson, lessonIndex, chapterIndex)}>
                                <RotateCw className="w-4 h-4 mr-2" />
                                Regenerate
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            onClick={() => setShowDeleteDialog(true)}
                            className="text-red-600"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Lesson
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this lesson? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                onDelete(lessonIndex, chapterIndex);
                                setShowDeleteDialog(false);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// Draggable Chapter Component
interface DraggableChapterProps {
    chapter: any;
    chapterIndex: number;
    onMove: (dragIndex: number, hoverIndex: number) => void;
    onEdit: (chapter: any, chapterIndex: number) => void;
    onDelete: (chapterIndex: number) => void;
    onAddLesson: (chapterIndex: number) => void;
    onLessonMove: (dragLessonIndex: number, hoverLessonIndex: number, dragChapterIndex: number, hoverChapterIndex: number) => void;
    onLessonEdit: (lesson: any, lessonIndex: number, chapterIndex: number) => void;
    onLessonDelete: (lessonIndex: number, chapterIndex: number) => void;
    onLessonSelect: (lesson: any) => void;
    onLessonGenerateVideo: (lesson: any, lessonIndex: number, chapterIndex: number) => void;
    selectedLesson: any;
}

const DraggableChapter: React.FC<DraggableChapterProps> = ({
    chapter,
    chapterIndex,
    onMove,
    onEdit,
    onDelete,
    onAddLesson,
    onLessonMove,
    onLessonEdit,
    onLessonDelete,
    onLessonSelect,
    onLessonGenerateVideo,
    selectedLesson
}) => {
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.CHAPTER,
        item: { chapterIndex, type: 'chapter' },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: ItemTypes.CHAPTER,
        hover: (draggedItem: any) => {
            if (draggedItem.chapterIndex !== chapterIndex) {
                onMove(draggedItem.chapterIndex, chapterIndex);
                draggedItem.chapterIndex = chapterIndex;
            }
        },
    });

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    return (
        <Card
            ref={node => {
                drag(drop(node));
            }}
            className={`mb-4 transition-all duration-200 ${
                isDragging ? 'opacity-50 rotate-2 shadow-lg' : 'opacity-100'
            }`}
        >
            <CardHeader className="pb-3 bg-muted dark:bg-card border-b cursor-move">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <Folder className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg">
                            Chapter {chapterIndex + 1}: {chapter.title}
                        </CardTitle>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onAddLesson(chapterIndex)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Lesson
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(chapter, chapterIndex)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Chapter
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={() => setShowDeleteDialog(true)}
                                className="text-red-600"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Chapter
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="p-2">
                {chapter.lessons?.map((lesson: any, lessonIndex: number) => (
                    <DraggableLesson
                        key={`lesson-${chapterIndex}-${lessonIndex}`}
                        lesson={lesson}
                        lessonIndex={lessonIndex}
                        chapterIndex={chapterIndex}
                        onMove={onLessonMove}
                        onEdit={onLessonEdit}
                        onDelete={onLessonDelete}
                        onSelect={onLessonSelect}
                        onGenerateVideo={onLessonGenerateVideo}
                        isSelected={selectedLesson?.id === lesson.id}
                    />
                ))}
            </CardContent>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this chapter and all its lessons? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                onDelete(chapterIndex);
                                setShowDeleteDialog(false);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};

// Main CourseView Component
const CourseView: React.FC = () => {
    const params = useParams();
    const router = useRouter();
    const courseId = params?.courseId as string;

    // State
    const [course, setCourse] = useState<CourseResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLesson, setSelectedLesson] = useState<any>(null);
    const [editModalData, setEditModalData] = useState<EditModalData | null>(null);
    const [editForm, setEditForm] = useState({ title: '', description: '', content: '' });
    const [courseProgress, setCourseProgress] = useState<any>(null);
    const [isProgressLoading, setIsProgressLoading] = useState(false);
    const [addChapterDialogOpen, setAddChapterDialogOpen] = useState(false);
    const [addChapterForm, setAddChapterForm] = useState({ title: '', description: '' });
    const [addLessonDialogOpen, setAddLessonDialogOpen] = useState(false);
    const [addLessonForm, setAddLessonForm] = useState({ title: '', description: '', content: '' });
    const [addLessonChapterIndex, setAddLessonChapterIndex] = useState<number>(0);

    // Refs for managing API calls
    const lastProgressCallRef = useRef<number>(0);
    const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fetchCourseDataCalled = useRef(false);

    // Background progress fetching
    const fetchProgressInBackground = useCallback(async (courseData?: CourseResponse) => {
        if (!courseId) return;

        const now = Date.now();
        if (isProgressLoading || (now - lastProgressCallRef.current < 2000)) {
            return;
        }

        lastProgressCallRef.current = now;

        if (progressTimeoutRef.current) {
            clearTimeout(progressTimeoutRef.current);
            progressTimeoutRef.current = null;
        }

        setIsProgressLoading(true);
        try {
            const progress = await getCourseProgress(courseId);
            setCourseProgress(progress);

            const updatedCourseData = await getCourse(courseId);
            setCourse(updatedCourseData);

            if (selectedLesson) {
                const updatedLesson = updatedCourseData.chapters
                    .flatMap(chapter => chapter.lessons)
                    .find(lesson => lesson.id === selectedLesson.id);
                if (updatedLesson) {
                    setSelectedLesson(updatedLesson);
                }
            }
        } catch (error) {
            console.log('Could not fetch progress:', error);
        } finally {
            setIsProgressLoading(false);
        }
    }, [courseId, isProgressLoading, selectedLesson]);

    // Fetch course data
    const fetchCourseData = async () => {
        if (!courseId) return;

        const currentAccount = useAccountStore.getState().currentAccount;
        if (!currentAccount || !currentAccount.id) {
            console.log("Cannot fetch course data: No account ID available");
            toast.error("Account information not available. Please try again.");
            return;
        }

        setLoading(true);
        try {
            const courseData = await getCourse(courseId);
            setCourse(courseData);

            const hasIncompleteLessons = courseData.chapters.some(chapter =>
                chapter.lessons.some((lesson: any) =>
                    lesson.task_id && (!lesson.status || lesson.status !== 'completed')
                )
            );

            if (hasIncompleteLessons) {
                progressTimeoutRef.current = setTimeout(() => {
                    fetchProgressInBackground(courseData);
                }, 100);
            }
        } catch (error) {
            console.error('Failed to fetch course:', error);
            toast.error('Failed to load course data');
        } finally {
            setLoading(false);
        }
    };

    // Initialize data
    useEffect(() => {
        const currentAccount = useAccountStore.getState().currentAccount;
        if (courseId && currentAccount && !fetchCourseDataCalled.current) {
            fetchCourseData();
            fetchCourseDataCalled.current = true;
        }

        return () => {
            if (progressTimeoutRef.current) {
                clearTimeout(progressTimeoutRef.current);
                progressTimeoutRef.current = null;
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, [courseId]);

    // Drag and drop handlers
    const moveChapter = useCallback((dragIndex: number, hoverIndex: number) => {
        if (!course) return;
        const draggedChapter = course.chapters[dragIndex];
        const newChapters = [...course.chapters];
        newChapters.splice(dragIndex, 1);
        newChapters.splice(hoverIndex, 0, draggedChapter);
        setCourse({ ...course, chapters: newChapters });
    }, [course]);

    const moveLesson = useCallback((
        dragLessonIndex: number,
        hoverLessonIndex: number,
        dragChapterIndex: number,
        hoverChapterIndex: number
    ) => {
        if (!course) return;
        const newCourse = { ...course };
        const draggedLesson = newCourse.chapters[dragChapterIndex].lessons[dragLessonIndex];
        
        // Remove from source
        newCourse.chapters[dragChapterIndex].lessons.splice(dragLessonIndex, 1);
        
        // Add to destination
        newCourse.chapters[hoverChapterIndex].lessons.splice(hoverLessonIndex, 0, draggedLesson);
        
        setCourse(newCourse);
    }, [course]);

    // Edit handlers
    const handleEdit = (type: 'chapter' | 'lesson', data: any, chapterIndex?: number, lessonIndex?: number) => {
        setEditModalData({ type, data, chapterIndex, lessonIndex });
        setEditForm({
            title: data.title || '',
            description: data.description || '',
            content: data.content || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editModalData || !course) return;

        try {
            const newCourse = { ...course };
            
            if (editModalData.type === 'chapter' && editModalData.chapterIndex !== undefined) {
                newCourse.chapters[editModalData.chapterIndex] = {
                    ...newCourse.chapters[editModalData.chapterIndex],
                    title: editForm.title,
                    description: editForm.description
                };
            } else if (editModalData.type === 'lesson' && editModalData.chapterIndex !== undefined && editModalData.lessonIndex !== undefined) {
                newCourse.chapters[editModalData.chapterIndex].lessons[editModalData.lessonIndex] = {
                    ...newCourse.chapters[editModalData.chapterIndex].lessons[editModalData.lessonIndex],
                    title: editForm.title,
                    description: editForm.description,
                    content: editForm.content
                };
            }

            setCourse(newCourse);
            await updateCourse(courseId, newCourse);
            
            setEditModalData(null);
            setEditForm({ title: '', description: '', content: '' });
            toast.success(`${editModalData.type === 'chapter' ? 'Chapter' : 'Lesson'} updated successfully`);
        } catch (error) {
            console.error('Failed to update:', error);
            toast.error('Failed to save changes');
        }
    };

    // Delete handlers
    const handleDeleteChapter = async (chapterIndex: number) => {
        if (!course) return;
        
        try {
            const newCourse = { ...course };
            newCourse.chapters.splice(chapterIndex, 1);
            setCourse(newCourse);
            await updateCourse(courseId, newCourse);
            toast.success('Chapter deleted successfully');
        } catch (error) {
            console.error('Failed to delete chapter:', error);
            toast.error('Failed to delete chapter');
        }
    };

    const handleDeleteLesson = async (lessonIndex: number, chapterIndex: number) => {
        if (!course) return;
        
        try {
            const newCourse = { ...course };
            newCourse.chapters[chapterIndex].lessons.splice(lessonIndex, 1);
            setCourse(newCourse);
            await updateCourse(courseId, newCourse);
            toast.success('Lesson deleted successfully');
        } catch (error) {
            console.error('Failed to delete lesson:', error);
            toast.error('Failed to delete lesson');
        }
    };

    // Add lesson handler
    const handleAddLesson = (chapterIndex: number) => {
        setAddLessonForm({ title: '', description: '', content: '' });
        setAddLessonChapterIndex(chapterIndex);
        setAddLessonDialogOpen(true);
    };

    // Submit add lesson
    const handleSubmitAddLesson = async () => {
        if (!course || !addLessonForm.title.trim()) {
            toast.error('Please enter a lesson title');
            return;
        }
        
        const newLesson = {
            id: `lesson-${Date.now()}`,
            title: addLessonForm.title.trim(),
            description: addLessonForm.description.trim(),
            content: addLessonForm.content.trim(),
            order: course.chapters[addLessonChapterIndex].lessons.length + 1
        };

        try {
            const newCourse = { ...course };
            newCourse.chapters[addLessonChapterIndex].lessons.push(newLesson);
            setCourse(newCourse);
            await updateCourse(courseId, newCourse);
            setAddLessonDialogOpen(false);
            setAddLessonForm({ title: '', description: '', content: '' });
            toast.success('Lesson added successfully');
        } catch (error) {
            console.error('Failed to add lesson:', error);
            toast.error('Failed to add lesson');
        }
    };

    // Add chapter handler
    const handleAddChapter = () => {
        setAddChapterForm({ title: '', description: '' });
        setAddChapterDialogOpen(true);
    };

    // Submit add chapter
    const handleSubmitAddChapter = async () => {
        if (!course || !addChapterForm.title.trim()) {
            toast.error('Please enter a chapter title');
            return;
        }
        
        const newChapter = {
            id: `chapter-${Date.now()}`,
            title: addChapterForm.title.trim(),
            description: addChapterForm.description.trim(),
            lessons: [],
            order: course.chapters.length + 1
        };

        try {
            const newCourse = { ...course };
            newCourse.chapters.push(newChapter);
            setCourse(newCourse);
            await updateCourse(courseId, newCourse);
            setAddChapterDialogOpen(false);
            setAddChapterForm({ title: '', description: '' });
            toast.success('Chapter added successfully');
        } catch (error) {
            console.error('Failed to add chapter:', error);
            toast.error('Failed to add chapter');
        }
    };

    // Generate video handler
    const handleGenerateVideo = async (lesson: any, lessonIndex: number, chapterIndex: number) => {
        try {
            await generateLessonVideo(lesson.id);
            toast.success('Video generation started');
            
            // Start polling for updates
            setTimeout(() => {
                fetchProgressInBackground();
            }, 1000);
        } catch (error) {
            console.error('Failed to generate video:', error);
            toast.error('Failed to start video generation');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 dark:from-background dark:via-background dark:to-card/30">
                {/* Header Skeleton */}
                <div className="bg-background dark:bg-card border-b shadow-sm">
                    <div className="max-w-6xl mx-auto p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-24" /> {/* Back button */}
                                <div className="h-6 w-px bg-border" />
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-6 w-6 rounded" /> {/* Icon */}
                                    <div>
                                        <Skeleton className="h-8 w-80 mb-1" /> {/* Title */}
                                        <Skeleton className="h-4 w-96" /> {/* Description */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Skeleton */}
                <div className="max-w-6xl mx-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Course Structure Skeleton */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-5 w-5 rounded" />
                                        <Skeleton className="h-6 w-40" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Chapter Skeletons */}
                                    {[1, 2, 3].map(i => (
                                        <Card key={i} className="border border-border">
                                            <CardHeader className="pb-3 bg-muted dark:bg-card border-b">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="h-4 w-4" /> {/* Grip */}
                                                        <Skeleton className="h-5 w-5 rounded" /> {/* Folder icon */}
                                                        <Skeleton className="h-6 w-48" /> {/* Chapter title */}
                                                    </div>
                                                    <Skeleton className="h-8 w-8 rounded" /> {/* Menu button */}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4 space-y-2">
                                                {/* Lesson Skeletons */}
                                                {[1, 2, 3].map(j => (
                                                    <div key={j} className="flex items-center justify-between p-3 rounded-lg border border-border">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <Skeleton className="h-4 w-4" /> {/* Grip */}
                                                            <Skeleton className="h-4 w-4 rounded" /> {/* File icon */}
                                                            <Skeleton className="h-4 w-64" /> {/* Lesson title */}
                                                            <Skeleton className="h-5 w-16 rounded-full" /> {/* Status badge */}
                                                        </div>
                                                        <Skeleton className="h-8 w-8 rounded" /> {/* Menu button */}
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    ))}
                                    
                                    {/* Add Chapter Button Skeleton */}
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <Skeleton className="h-10 w-full rounded-md" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Lesson Details Panel Skeleton */}
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-5 w-5 rounded" />
                                        <Skeleton className="h-6 w-32" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-8">
                                        <Skeleton className="h-12 w-12 mx-auto mb-3 rounded" />
                                        <Skeleton className="h-4 w-48 mx-auto" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 dark:from-background dark:via-background dark:to-card/30 flex items-center justify-center">
                <Card className="max-w-md mx-auto text-center">
                    <CardContent className="p-8">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Course Not Found</h2>
                        <p className="text-muted-foreground mb-4">The course you're looking for doesn't exist or has been deleted.</p>
                        <Button onClick={() => router.push('/courses')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Courses
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 dark:from-background dark:via-background dark:to-card/30">
                {/* Header */}
                <div className="bg-background dark:bg-card border-b shadow-sm">
                    <div className="max-w-6xl mx-auto p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/courses')}
                                    className="flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Courses
                                </Button>
                                <Separator orientation="vertical" className="h-6" />
                                <div className="flex items-center gap-3">
                                    <BookOpen className="w-6 h-6 text-primary" />
                                    <div>
                                        <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
                                        <p className="text-muted-foreground">{course.description}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-6xl mx-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Course Structure */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Folder className="w-5 h-5 text-primary" />
                                        Course Structure
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {course.chapters?.map((chapter: any, chapterIndex: number) => (
                                        <DraggableChapter
                                            key={`chapter-${chapterIndex}`}
                                            chapter={chapter}
                                            chapterIndex={chapterIndex}
                                            onMove={moveChapter}
                                            onEdit={(chapter, index) => handleEdit('chapter', chapter, index)}
                                            onDelete={handleDeleteChapter}
                                            onAddLesson={handleAddLesson}
                                            onLessonMove={moveLesson}
                                            onLessonEdit={(lesson, lessonIndex, chapterIndex) => 
                                                handleEdit('lesson', lesson, chapterIndex, lessonIndex)
                                            }
                                            onLessonDelete={handleDeleteLesson}
                                            onLessonSelect={setSelectedLesson}
                                            onLessonGenerateVideo={handleGenerateVideo}
                                            selectedLesson={selectedLesson}
                                        />
                                    ))}
                                    
                                    {/* Add Chapter Button */}
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={handleAddChapter}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add New Chapter
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Lesson Details Panel */}
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" />
                                        Lesson Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedLesson ? (
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="font-semibold text-lg">{selectedLesson.title}</h3>
                                                <p className="text-muted-foreground text-sm mt-1">{selectedLesson.description}</p>
                                            </div>
                                            
                                            {selectedLesson.content && (
                                                <div>
                                                    <h4 className="font-medium text-sm text-foreground mb-2">Content:</h4>
                                                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                                                        {selectedLesson.content}
                                                    </p>
                                                </div>
                                            )}

                                            {selectedLesson.video_url && (
                                                <div>
                                                    <h4 className="font-medium text-sm text-foreground mb-2">Video:</h4>
                                                    <div className="bg-black rounded-lg overflow-hidden">
                                                        <video 
                                                            controls 
                                                            className="w-full"
                                                            src={selectedLesson.video_url}
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-2 w-full"
                                                        onClick={() => window.open(selectedLesson.video_url, '_blank')}
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download Video
                                                    </Button>
                                                </div>
                                            )}

                                            {selectedLesson.task_id && !selectedLesson.video_url && (
                                                <div className="text-center py-4">
                                                    <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                                                    <p className="text-sm text-muted-foreground">Video generation in progress...</p>
                                                </div>
                                            )}

                                            {!selectedLesson.task_id && !selectedLesson.video_url && (
                                                <Button
                                                    className="w-full"
                                                    onClick={() => {
                                                        const chapterIndex = course.chapters.findIndex((c: any) => 
                                                            c.lessons.some((l: any) => l.id === selectedLesson.id)
                                                        );
                                                        const lessonIndex = course.chapters[chapterIndex]?.lessons.findIndex((l: any) => 
                                                            l.id === selectedLesson.id
                                                        );
                                                        if (chapterIndex !== -1 && lessonIndex !== -1) {
                                                            handleGenerateVideo(selectedLesson, lessonIndex, chapterIndex);
                                                        }
                                                    }}
                                                >
                                                    <Play className="w-4 h-4 mr-2" />
                                                    Generate Video
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                                            <p>Select a lesson to view details</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Edit Modal */}
                <Dialog open={!!editModalData} onOpenChange={() => setEditModalData(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                Edit {editModalData?.type === 'chapter' ? 'Chapter' : 'Lesson'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">
                                    Title *
                                </label>
                                <Input
                                    value={editForm.title}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Enter title"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">
                                    Description *
                                </label>
                                <Textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Enter description"
                                    rows={3}
                                />
                            </div>
                            {editModalData?.type === 'lesson' && (
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">
                                        Content
                                    </label>
                                    <Textarea
                                        value={editForm.content}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder="Enter lesson content"
                                        rows={5}
                                    />
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditModalData(null)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveEdit}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Add Chapter Dialog */}
                <Dialog open={addChapterDialogOpen} onOpenChange={setAddChapterDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Chapter</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">
                                    Chapter Title *
                                </label>
                                <Input
                                    value={addChapterForm.title}
                                    onChange={(e) => setAddChapterForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Enter chapter title"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">
                                    Chapter Description
                                </label>
                                <Textarea
                                    value={addChapterForm.description}
                                    onChange={(e) => setAddChapterForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Enter chapter description"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddChapterDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmitAddChapter} disabled={!addChapterForm.title.trim()}>
                                Add Chapter
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Add Lesson Dialog */}
                <Dialog open={addLessonDialogOpen} onOpenChange={setAddLessonDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add New Lesson</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">
                                    Lesson Title *
                                </label>
                                <Input
                                    value={addLessonForm.title}
                                    onChange={(e) => setAddLessonForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Enter lesson title"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">
                                    Lesson Description
                                </label>
                                <Textarea
                                    value={addLessonForm.description}
                                    onChange={(e) => setAddLessonForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Enter lesson description"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">
                                    Lesson Content
                                </label>
                                <Textarea
                                    value={addLessonForm.content}
                                    onChange={(e) => setAddLessonForm(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="Enter lesson content"
                                    rows={5}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddLessonDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmitAddLesson} disabled={!addLessonForm.title.trim()}>
                                Add Lesson
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DndProvider>
    );
};

export default CourseView;
